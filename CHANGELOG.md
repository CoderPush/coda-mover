# coda-mover

## 2.1.4

### Patch Changes

- a175790: Validate max page file size for outline import (1.45MB)
- 95458c9: Use markdown as main import format, with images collected from html export
- e4adc19: More meaningful indications to users with Outline errors
- fb091fe: Fix order of sub docs on Outline after imports

## 2.1.3

### Patch Changes

- Add checked items filter (cc2be54)
- Datatable for docs (423ec27)
  - Filtering and quick selection
  - Additionally, fix app logs and data path for zip build

## 2.1.2

### Patch Changes

- Port app into Electron (MacOS builds)
- Add stop imports button

## 2.1.1

### Patch Changes

- Simplified UI with minize status updates and view updates

## 2.1.0

### Minor Changes

- Concise and performant flows

## 2.0.2

### Patch Changes

- b3d4518: Outline importer:
  - Outline pusher and APIs for importing synced docs, pages into Outline
  - UI for selecting docs and pages, importing form
  - Enhancement for item listing UI

## 2.0.1

### Patch Changes

- Puller flow:
  - List docs and pages from Coda APIs and save to filesystem (data folder)
  - Pages are exported as html so they can be imported to Outline APIs later
  - Communicate between UI and background tasks through Websocket
  - Necessary Coda APIs for exporting docs and pages
  - APIs for exporting pages are automatically retried
