# QrScannerWeb
## _Qr Scanner For Flutter Web_

[https://github.com/hmbenhaim/qr_scanner_web]

## Useage
- inport int your index.html  
```sh
 <script src="assets/packages/qr_scanner_web/assets/qr_scanner_web.js" type="text/javascript"></script>
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