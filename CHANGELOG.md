# coda-mover

## 2.0.1

### Patch Changes

+ Puller flow:
  - List docs and pages from Coda APIs and save to filesystem (data folder)
  - Pages are exported as html so they can be imported to Outline APIs later
  - Communicate between UI and background tasks through Websocket
  - Necessary Coda APIs for exporting docs and pages
  - APIs for exporting pages are automatically retried
