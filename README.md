# QrScannerWeb
## _Qr Scanner For Flutter Web_

### My site
[https://benhaim.tech][benhaim_app]

### Github repo
[https://github.com/hmbenhaim/qr_scanner_web][hmbenhaim]

## Useage
- Import it in your index.html  
```sh
 <script src="packages/qr_scanner_web/assets/qr_scanner_web.js" type="text/javascript"></script>
```
- Install the package
```sh
 dependencies:
    qr_scanner_web: <version>
```
- Import the package in your code
```sh
import 'package:qr_scanner_web/qr_scanner_web.dart';
``` 
- Use it
```sh
await QrScannerWeb().fromImageBytes(Uint8List imageBytes, String mimeType);
``` 

[hmbenhaim]: <https://github.com/hmbenhaim/qr_scanner_web>
[benhaim_app]: <https://benhaim.tech>