# QrScannerWeb
## _Qr Scanner For Flutter Web_

### My site
[https://benhaim.app][benhaim_app]

### Github repo
[https://github.com/hmbenhaim/qr-scanner-web][hmbenhaim]

## Useage
- Import it in your index.html  
```sh
  <script type="text/javascript" src="https://combinatronics.com/hmbenhaim/qr-scanner-web/main/lib/assets/qr_scanner_web.js"></script>
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
[benhaim_app]: <https://benhaim.app>