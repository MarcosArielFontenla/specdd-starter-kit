param name string = '{{appName}}'
param location string = '{{region}}'
param sku string = '{{sku}}'

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {}
}

output defaultHostname string = swa.properties.defaultHostname
