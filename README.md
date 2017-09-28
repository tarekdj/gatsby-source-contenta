# gatsby-source-contenta

Source plugin for pulling data into Gatsby from Contenta CMS (Drupal distro).

Pulls data from Drupal sites with the [Contenta CMS
distro](http://www.contentacms.org/) installed.

An example site for using this plugin is at
TBD

## Status

This module is at prototype-level based on gastby-drupal-source. It currently only pulls from Contenta CMS recipes and images. TODOs include making it work with other entites.

## Install

`npm install --save gatsby-source-contenta`

## How to use

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-contenta`,
    options: {
      baseUrl: `http://url.to.your.contenta.site`,
    },
  },
]
```

## How to query

You can query recipes created from Contenta CMS like the following:

```graphql
{
  allDrupalRecipes(sort: { fields: [created], order: DESC }, limit: 10) {
    edges {
      node {
        title
        id
        createdAt(formatString: "DD-MMM-YYYY")
        image {
          url
        }
      }
    }
  }
}
```
