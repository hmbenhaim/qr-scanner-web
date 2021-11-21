@JS('flutter_qr_scanner_web')
library flutter_qr_scanner_web;

import 'dart:convert';
import 'dart:html';
import 'dart:js_util';
import 'dart:typed_data';

import 'package:js/js.dart';

class QrScannerWeb {
  final int viewId;
  late final DivElement container;

  QrScannerWeb(this.viewId) {
    final id = 'qr-scanner-container-$viewId';
    container = DivElement()
      ..id = id
      ..style.pointerEvents = 'auto'
      ..style.border = 'none'
      // idea from https://keithclark.co.uk/articles/working-with-elements-before-the-dom-is-ready/
      ..append(StyleElement()
        ..innerText =
            '@keyframes $id-animation {from { clip: rect(1px, auto, auto, auto); } to { clip: rect(0px, auto, auto, auto); }}')
      ..style.animationName = '$id-animation'
      ..style.animationDuration = '0.001s'
      ..style.width = '100%'
      ..style.height = '100%';
  }

  Future<String?> scanImage(Uint8List imageBytes, String mimeType) async {
    final base64 = base64Encode(imageBytes);
    final result = await promiseToFuture(
        _nativeScanImage(container, 'data:$mimeType;base64,$base64'));
    return result.toString();
  }
}

@JS('scanImage')
external Future<String?> _nativeScanImage(dynamic container, String image);
