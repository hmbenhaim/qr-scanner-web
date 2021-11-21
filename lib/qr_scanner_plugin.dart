import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:qr_scanner_web/qr_scanner_web.dart';

class QrScannerPlugin {
  static final _views = <int, QrScannerWeb>{};
  static final _readyCompleter = Completer<bool>();
  static late final Future<bool> _isReady;

  static void registerWith(Registrar registrar) {
    final self = QrScannerPlugin();
    _isReady = _readyCompleter.future;
    html.window.addEventListener('flutter_qr_scanner_web_ready', (_) {
      if (!_readyCompleter.isCompleted) _readyCompleter.complete(true);
    });

    // ignore: undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory(
        'com.creativephotocloud.plugins/qrscanner', (viewId) {
      final view = _views[viewId] = QrScannerWeb(viewId);
      return view.container;
    });

    html.document.body!.append(html.ScriptElement()
      ..src =
          'assets/packages/qr_scanner_web/assets/qr_scanner_web.js' // ignore: unsafe_html
      ..type = 'application/javascript'
      ..defer = true);
  }

  @override
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType,
      {required int viewId}) async {
    return await _views[viewId]!.scanImage(imageBytes, mimeType);
  }
}
