# QrScannerWeb
## _Qr Scanner For Flutter Web_

### My site
[https://benhaim.tech][benhaim_app]

### Github repo
[https://github.com/hmbenhaim/qr_scanner_web][hmbenhaim]

## Useage
- inport int your index.html  
```sh
 <script src="packages/qr_scanner_web/assets/qr_scanner_web.js" type="text/javascript"></script>
```
- inastall the package
```sh
 dependencies:
    qr_scanner_web: <version>
```
- Import package in your code
- Use it
```sh
await QrScannerWeb().fromImageBytes(Uint8List imageBytes, String mimeType);
``` 

[hmbenhaim]: <https://github.com/hmbenhaim/qr_scanner_web>
[benhaim_app]: <https://benhaim.tech>