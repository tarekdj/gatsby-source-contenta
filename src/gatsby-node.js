const axios = require(`axios`)
const crypto = require(`crypto`)
const _ = require(`lodash`)

const makeTypeName = type => `drupal__${type.replace(/-/g, `_`)}`

const processEntities = ents =>
  ents.map(ent => {
    const newEnt = {
      id: ent.id,
      internal: {
        type: ent.type,
      },
      ...ent.attributes,
      created: new Date(ent.attributes.createdAt * 1000).toJSON(),
      changed: new Date(ent.attributes.updatedAt * 1000).toJSON()
    }
    if (newEnt.revision_timestamp) {
      newEnt.revision_timestamp = new Date(
        newEnt.revision_timestamp * 1000
      ).toJSON()
    }

    return newEnt
  })

exports.sourceNodes = async (
  { boundActionCreators, getNode, hasNodeChanged, store },
  { baseUrl }
) => {
  const { createNode, setPluginStatus, touchNode } = boundActionCreators

  // Touch existing Drupal nodes so Gatsby doesn't garbage collect them.
  _.values(store.getState().nodes)
    .filter(n => n.internal.type.slice(0, 8) === `drupal__`)
    .forEach(n => touchNode(n.id))

  // Fetch articles.
  console.time(`fetch Drupal data`)
  console.log(`Starting to fetch data from Drupal`)

  let lastFetched
  if (
    store.getState().status.plugins &&
    store.getState().status.plugins[`gatsby-source-contenta`]
  ) {
    lastFetched = store.getState().status.plugins[`gatsby-source-contenta`].status
      .lastFetched
  }

  let url = `${baseUrl}/api/recipes`

  let result
  try {
    result = await axios.get(url)
  } catch (e) {
    console.log(`error fetching articles`, e)
  }

  console.log(`articles fetched`, result.data.data.length)
  setPluginStatus({
    status: {
      lastFetched: new Date().toJSON(),
    },
  })

  console.timeEnd(`fetch Drupal data`)

  const nodes = processEntities(result.data.data)
  nodes.forEach((node, i) => {

    const nodeStr = JSON.stringify(node)

    const gatsbyNode = {
      ...node,
      children: [],
      parent: `__SOURCE__`,
      internal: {
        ...node.relationships,
        type: makeTypeName(node.internal.type),
      },
      image___NODE: result.data.data[i].relationships.image.data.id,
    }

    // Get content digest of node.
    const contentDigest = crypto
      .createHash(`md5`)
      .update(JSON.stringify(gatsbyNode))
      .digest(`hex`)

    gatsbyNode.internal.contentDigest = contentDigest

    createNode(gatsbyNode)
  })

  // Fetch images
  const imageUrl = `${baseUrl}/api/images`
  const imageResult = await axios.get(imageUrl)

  //console.log(imageResult.data.data)
  const images = imageResult.data.data

  const blue = await Promise.all(
    images.map(
      (image, i) =>
        new Promise(resolve => {
          const imgStr = JSON.stringify(image)

          const gatsbyImage = {
            ...image,
            children: [],
            parent: `__SOURCE__`,
            internal: {
              type: makeTypeName(image.type),
            },
          }

          axios
            .get(
              imageResult.data.data[i].relationships.imageFile.links.related,
              { timeout: 20000 }
            )
            .catch(() => console.log(`fail fetch`, gatsbyImage))
            .then(pictureResult => {
              gatsbyImage.url = `${pictureResult.data.data
                .attributes.url}`

              // Get content digest of node.
              const contentDigest = crypto
                .createHash(`md5`)
                .update(JSON.stringify(gatsbyImage))
                .digest(`hex`)

              gatsbyImage.internal.contentDigest = contentDigest

              createNode(gatsbyImage)

              resolve()
            })
        })
    )
  )

  return
}
