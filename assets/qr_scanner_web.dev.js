"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var QrScanner =
  /*#__PURE__*/
  function () {
    _createClass(QrScanner, null, [{
      key: "hasCamera",

      /* async */
      value: function hasCamera() {
        if (!navigator.mediaDevices) return Promise.resolve(false); // note that enumerateDevices can always be called and does not prompt the user for permission. However, device
        // labels are only readable if served via https and an active media stream exists or permanent permission is
        // given. That doesn't matter for us though as we don't require labels.

        return navigator.mediaDevices.enumerateDevices().then(function (devices) {
          return devices.some(function (device) {
            return device.kind === 'videoinput';
          });
        })["catch"](function () {
          return false;
        });
      }
    }]);

    function QrScanner(video, onDecode) {
      var canvasSizeOrOnDecodeError = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this._onDecodeError.bind(this);
      var canvasSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : QrScanner.DEFAULT_CANVAS_SIZE;
      var preferredFacingMode = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'environment';

      _classCallCheck(this, QrScanner);

      this.$video = video;
      this.$canvas = document.createElement('canvas');
      this._onDecode = onDecode;
      this._preferredFacingMode = preferredFacingMode;
      this._active = false;
      this._paused = false;
      this._flashOn = false;

      if (typeof canvasSizeOrOnDecodeError === 'number') {
        // legacy function signature where canvas size is the third argument
        canvasSize = canvasSizeOrOnDecodeError;
        console.warn('You\'re using a deprecated version of the QrScanner constructor which will be removed in ' + 'the future');
      } else {
        this._onDecodeError = canvasSizeOrOnDecodeError;
      }

      this.$canvas.width = canvasSize;
      this.$canvas.height = canvasSize;
      this._sourceRect = {
        x: 0,
        y: 0,
        width: canvasSize,
        height: canvasSize
      };
      this._updateSourceRect = this._updateSourceRect.bind(this);
      this._onPlay = this._onPlay.bind(this);
      this._onVisibilityChange = this._onVisibilityChange.bind(this); // Allow inline playback on iPhone instead of requiring full screen playback,
      // see https://webkit.org/blog/6784/new-video-policies-for-ios/

      this.$video.playsInline = true; // Allow play() on iPhone without requiring a user gesture. Should not really be needed as camera stream
      // includes no audio, but just to be safe.

      this.$video.muted = true;
      this.$video.disablePictureInPicture = true;
      this.$video.addEventListener('loadedmetadata', this._updateSourceRect);
      this.$video.addEventListener('play', this._onPlay);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      this._qrEnginePromise = QrScanner.createQrEngine();
    }
    /* async */


    _createClass(QrScanner, [{
      key: "hasFlash",
      value: function hasFlash() {
        if (!('ImageCapture' in window)) {
          return Promise.resolve(false);
        }

        var track = this.$video.srcObject ? this.$video.srcObject.getVideoTracks()[0] : null;

        if (!track) {
          return Promise.reject('Camera not started or not available');
        }

        var imageCapture = new ImageCapture(track);
        return imageCapture.getPhotoCapabilities().then(function (result) {
          return result.fillLightMode.includes('flash');
        })["catch"](function (error) {
          console.warn(error);
          return false;
        });
      }
    }, {
      key: "isFlashOn",
      value: function isFlashOn() {
        return this._flashOn;
      }
      /* async */

    }, {
      key: "toggleFlash",
      value: function toggleFlash() {
        return this._setFlash(!this._flashOn);
      }
      /* async */

    }, {
      key: "turnFlashOff",
      value: function turnFlashOff() {
        return this._setFlash(false);
      }
      /* async */

    }, {
      key: "turnFlashOn",
      value: function turnFlashOn() {
        return this._setFlash(true);
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.$video.removeEventListener('loadedmetadata', this._updateSourceRect);
        this.$video.removeEventListener('play', this._onPlay);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this.stop();

        QrScanner._postWorkerMessage(this._qrEnginePromise, 'close');
      }
      /* async */

    }, {
      key: "start",
      value: function start() {
        var _this = this;

        if (this._active && !this._paused) {
          return Promise.resolve();
        }

        if (window.location.protocol !== 'https:') {
          // warn but try starting the camera anyways
          console.warn('The camera stream is only accessible if the page is transferred via https.');
        }

        this._active = true;
        this._paused = false;

        if (document.hidden) {
          // camera will be started as soon as tab is in foreground
          return Promise.resolve();
        }

        clearTimeout(this._offTimeout);
        this._offTimeout = null;

        if (this.$video.srcObject) {
          // camera stream already/still set
          this.$video.play();
          return Promise.resolve();
        }

        var facingMode = this._preferredFacingMode;
        return this._getCameraStream(facingMode, true)["catch"](function () {
          // We (probably) don't have a camera of the requested facing mode
          facingMode = facingMode === 'environment' ? 'user' : 'environment';
          return _this._getCameraStream(); // throws if camera is not accessible (e.g. due to not https)
        }).then(function (stream) {
          // Try to determine the facing mode from the stream, otherwise use our guess. Note that the guess is not
          // always accurate as Safari returns cameras of different facing mode, even for exact constraints.
          facingMode = _this._getFacingMode(stream) || facingMode;
          _this.$video.srcObject = stream;

          _this.$video.play();

          _this._setVideoMirror(facingMode);
        })["catch"](function (e) {
          _this._active = false;
          throw e;
        });
      }
    }, {
      key: "stop",
      value: function stop() {
        this.pause();
        this._active = false;
      }
    }, {
      key: "pause",
      value: function pause() {
        var _this2 = this;

        this._paused = true;

        if (!this._active) {
          return;
        }

        this.$video.pause();

        if (this._offTimeout) {
          return;
        }

        this._offTimeout = setTimeout(function () {
          var tracks = _this2.$video.srcObject ? _this2.$video.srcObject.getTracks() : [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = tracks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var track = _step.value;
              track.stop(); //  note that this will also automatically turn the flashlight off
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          _this2.$video.srcObject = null;
          _this2._offTimeout = null;
        }, 300);
      }
      /* async */

    }, {
      key: "setGrayscaleWeights",
      value: function setGrayscaleWeights(red, green, blue) {
        var useIntegerApproximation = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations work also
        // well with colored qr codes.
        QrScanner._postWorkerMessage(this._qrEnginePromise, 'grayscaleWeights', {
          red: red,
          green: green,
          blue: blue,
          useIntegerApproximation: useIntegerApproximation
        });
      }
    }, {
      key: "setInversionMode",
      value: function setInversionMode(inversionMode) {
        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations scan normal
        // and inverted qr codes by default
        QrScanner._postWorkerMessage(this._qrEnginePromise, 'inversionMode', inversionMode);
      }
      /* async */

    }, {
      key: "_onPlay",
      value: function _onPlay() {
        this._updateSourceRect();

        this._scanFrame();
      }
    }, {
      key: "_onVisibilityChange",
      value: function _onVisibilityChange() {
        if (document.hidden) {
          this.pause();
        } else if (this._active) {
          this.start();
        }
      }
    }, {
      key: "_updateSourceRect",
      value: function _updateSourceRect() {
        var smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
        var sourceRectSize = Math.round(2 / 3 * smallestDimension);
        this._sourceRect.width = this._sourceRect.height = sourceRectSize;
        this._sourceRect.x = (this.$video.videoWidth - sourceRectSize) / 2;
        this._sourceRect.y = (this.$video.videoHeight - sourceRectSize) / 2;
      }
    }, {
      key: "_scanFrame",
      value: function _scanFrame() {
        var _this3 = this;

        if (!this._active || this.$video.paused || this.$video.ended) return false; // using requestAnimationFrame to avoid scanning if tab is in background

        requestAnimationFrame(function () {
          if (_this3.$video.readyState <= 1) {
            // Skip scans until the video is ready as drawImage() only works correctly on a video with readyState
            // > 1, see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage#Notes.
            // This also avoids false positives for videos paused after a successful scan which remains visible on
            // the canvas until the video is started again and ready.
            _this3._scanFrame();

            return;
          }

          _this3._qrEnginePromise.then(function (qrEngine) {
            return QrScanner.scanImage(_this3.$video, _this3._sourceRect, qrEngine, _this3.$canvas, true);
          }).then(_this3._onDecode, function (error) {
            if (!_this3._active) return;
            var errorMessage = error.message || error;

            if (errorMessage.indexOf('service unavailable') !== -1) {
              // When the native BarcodeDetector crashed, create a new one
              _this3._qrEnginePromise = QrScanner.createQrEngine();
            }

            _this3._onDecodeError(error);
          }).then(function () {
            return _this3._scanFrame();
          });
        });
      }
    }, {
      key: "_onDecodeError",
      value: function _onDecodeError(error) {
        // default error handler; can be overwritten in the constructor
        if (error === QrScanner.NO_QR_CODE_FOUND) return;
        console.log(error);
      }
    }, {
      key: "_getCameraStream",
      value: function _getCameraStream(facingMode) {
        var exact = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var constraintsToTry = [{
          width: {
            min: 1024
          }
        }, {
          width: {
            min: 768
          }
        }, {}];

        if (facingMode) {
          if (exact) {
            facingMode = {
              exact: facingMode
            };
          }

          constraintsToTry.forEach(function (constraint) {
            return constraint.facingMode = facingMode;
          });
        }

        return this._getMatchingCameraStream(constraintsToTry);
      }
    }, {
      key: "_getMatchingCameraStream",
      value: function _getMatchingCameraStream(constraintsToTry) {
        var _this4 = this;

        if (!navigator.mediaDevices || constraintsToTry.length === 0) {
          return Promise.reject('Camera not found.');
        }

        return navigator.mediaDevices.getUserMedia({
          video: constraintsToTry.shift()
        })["catch"](function () {
          return _this4._getMatchingCameraStream(constraintsToTry);
        });
      }
      /* async */

    }, {
      key: "_setFlash",
      value: function _setFlash(on) {
        var _this5 = this;

        return this.hasFlash().then(function (hasFlash) {
          if (!hasFlash) return Promise.reject('No flash available'); // Note that the video track is guaranteed to exist at this point

          return _this5.$video.srcObject.getVideoTracks()[0].applyConstraints({
            advanced: [{
              torch: on
            }]
          });
        }).then(function () {
          return _this5._flashOn = on;
        });
      }
    }, {
      key: "_setVideoMirror",
      value: function _setVideoMirror(facingMode) {
        // in user facing mode mirror the video to make it easier for the user to position the QR code
        var scaleFactor = facingMode === 'user' ? -1 : 1;
        this.$video.style.transform = 'scaleX(' + scaleFactor + ')';
      }
    }, {
      key: "_getFacingMode",
      value: function _getFacingMode(videoStream) {
        var videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) return null; // unknown
        // inspired by https://github.com/JodusNodus/react-qr-reader/blob/master/src/getDeviceId.js#L13

        return /rear|back|environment/i.test(videoTrack.label) ? 'environment' : /front|user|face/i.test(videoTrack.label) ? 'user' : null; // unknown
      }
    }], [{
      key: "scanImage",
      value: function scanImage(imageOrFileOrUrl) {
        var _this6 = this;

        var sourceRect = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var qrEngine = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var canvas = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var fixedCanvasSize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
        var alsoTryWithoutSourceRect = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;
        var gotExternalWorker = qrEngine instanceof Worker;
        var promise = Promise.all([qrEngine || QrScanner.createQrEngine(), QrScanner._loadImage(imageOrFileOrUrl)]).then(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
            engine = _ref2[0],
            image = _ref2[1];

          qrEngine = engine;
          var canvasContext;

          var _this6$_drawToCanvas = _this6._drawToCanvas(image, sourceRect, canvas, fixedCanvasSize);

          var _this6$_drawToCanvas2 = _slicedToArray(_this6$_drawToCanvas, 2);

          canvas = _this6$_drawToCanvas2[0];
          canvasContext = _this6$_drawToCanvas2[1];

          if (qrEngine instanceof Worker) {
            if (!gotExternalWorker) {
              // Enable scanning of inverted color qr codes. Not using _postWorkerMessage as it's async
              qrEngine.postMessage({
                type: 'inversionMode',
                data: 'both'
              });
            }

            return new Promise(function (resolve, reject) {
              var timeout, _onMessage, _onError;

              _onMessage = function onMessage(event) {
                if (event.data.type !== 'qrResult') {
                  return;
                }

                qrEngine.removeEventListener('message', _onMessage);
                qrEngine.removeEventListener('error', _onError);
                clearTimeout(timeout);

                if (event.data.data !== null) {
                  resolve(event.data.data);
                } else {
                  reject(QrScanner.NO_QR_CODE_FOUND);
                }
              };

              _onError = function onError(e) {
                qrEngine.removeEventListener('message', _onMessage);
                qrEngine.removeEventListener('error', _onError);
                clearTimeout(timeout);
                var errorMessage = !e ? 'Unknown Error' : e.message || e;
                reject('Scanner error: ' + errorMessage);
              };

              qrEngine.addEventListener('message', _onMessage);
              qrEngine.addEventListener('error', _onError);
              timeout = setTimeout(function () {
                return _onError('timeout');
              }, 10000);
              var imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
              qrEngine.postMessage({
                type: 'decode',
                data: imageData
              }, [imageData.data.buffer]);
            });
          } else {
            return new Promise(function (resolve, reject) {
              var timeout = setTimeout(function () {
                return reject('Scanner error: timeout');
              }, 10000);
              qrEngine.detect(canvas).then(function (scanResults) {
                if (!scanResults.length) {
                  reject(QrScanner.NO_QR_CODE_FOUND);
                } else {
                  resolve(scanResults[0].rawValue);
                }
              })["catch"](function (e) {
                return reject('Scanner error: ' + (e.message || e));
              })["finally"](function () {
                return clearTimeout(timeout);
              });
            });
          }
        });

        if (sourceRect && alsoTryWithoutSourceRect) {
          promise = promise["catch"](function () {
            return QrScanner.scanImage(imageOrFileOrUrl, null, qrEngine, canvas, fixedCanvasSize);
          });
        }

        promise = promise["finally"](function () {
          if (gotExternalWorker) return;

          QrScanner._postWorkerMessage(qrEngine, 'close');
        });
        return promise;
      }
    }, {
      key: "createQrEngine",
      value: function createQrEngine() {
        var workerPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : QrScanner.WORKER_PATH;
        return ('BarcodeDetector' in window ? BarcodeDetector.getSupportedFormats() : Promise.resolve([])).then(function (supportedFormats) {
          return supportedFormats.indexOf('qr_code') !== -1 ? new BarcodeDetector({
            formats: ['qr_code']
          }) : new Worker(workerPath);
        });
      }
    }, {
      key: "_drawToCanvas",
      value: function _drawToCanvas(image) {
        var sourceRect = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var canvas = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var fixedCanvasSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        canvas = canvas || document.createElement('canvas');
        var sourceRectX = sourceRect && sourceRect.x ? sourceRect.x : 0;
        var sourceRectY = sourceRect && sourceRect.y ? sourceRect.y : 0;
        var sourceRectWidth = sourceRect && sourceRect.width ? sourceRect.width : image.width || image.videoWidth;
        var sourceRectHeight = sourceRect && sourceRect.height ? sourceRect.height : image.height || image.videoHeight;

        if (!fixedCanvasSize && (canvas.width !== sourceRectWidth || canvas.height !== sourceRectHeight)) {
          canvas.width = sourceRectWidth;
          canvas.height = sourceRectHeight;
        }

        var context = canvas.getContext('2d', {
          alpha: false
        });
        context.imageSmoothingEnabled = false; // gives less blurry images

        context.drawImage(image, sourceRectX, sourceRectY, sourceRectWidth, sourceRectHeight, 0, 0, canvas.width, canvas.height);
        return [canvas, context];
      }
      /* async */

    }, {
      key: "_loadImage",
      value: function _loadImage(imageOrFileOrBlobOrUrl) {
        if (imageOrFileOrBlobOrUrl instanceof HTMLCanvasElement || imageOrFileOrBlobOrUrl instanceof HTMLVideoElement || window.ImageBitmap && imageOrFileOrBlobOrUrl instanceof window.ImageBitmap || window.OffscreenCanvas && imageOrFileOrBlobOrUrl instanceof window.OffscreenCanvas) {
          return Promise.resolve(imageOrFileOrBlobOrUrl);
        } else if (imageOrFileOrBlobOrUrl instanceof Image) {
          return QrScanner._awaitImageLoad(imageOrFileOrBlobOrUrl).then(function () {
            return imageOrFileOrBlobOrUrl;
          });
        } else if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob || imageOrFileOrBlobOrUrl instanceof URL || typeof imageOrFileOrBlobOrUrl === 'string') {
          var image = new Image();

          if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
            image.src = URL.createObjectURL(imageOrFileOrBlobOrUrl);
          } else {
            image.src = imageOrFileOrBlobOrUrl;
          }

          return QrScanner._awaitImageLoad(image).then(function () {
            if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
              URL.revokeObjectURL(image.src);
            }

            return image;
          });
        } else {
          return Promise.reject('Unsupported image type.');
        }
      }
      /* async */

    }, {
      key: "_awaitImageLoad",
      value: function _awaitImageLoad(image) {
        return new Promise(function (resolve, reject) {
          if (image.complete && image.naturalWidth !== 0) {
            // already loaded
            resolve();
          } else {
            var _onLoad, _onError2;

            _onLoad = function onLoad() {
              image.removeEventListener('load', _onLoad);
              image.removeEventListener('error', _onError2);
              resolve();
            };

            _onError2 = function onError() {
              image.removeEventListener('load', _onLoad);
              image.removeEventListener('error', _onError2);
              reject('Image load error');
            };

            image.addEventListener('load', _onLoad);
            image.addEventListener('error', _onError2);
          }
        });
      }
      /* async */

    }, {
      key: "_postWorkerMessage",
      value: function _postWorkerMessage(qrEngineOrQrEnginePromise, type, data) {
        return Promise.resolve(qrEngineOrQrEnginePromise).then(function (qrEngine) {
          if (!(qrEngine instanceof Worker)) return;
          qrEngine.postMessage({
            type: type,
            data: data
          });
        });
      }
    }]);

    return QrScanner;
  }();

QrScanner.DEFAULT_CANVAS_SIZE = 400;
QrScanner.NO_QR_CODE_FOUND = 'No QR code found';
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';

function qrInImage(image) {
  var result;
  return regeneratorRuntime.async(function qrInImage$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(QrScanner.scanImage(image));

        case 3:
          result = _context.sent;
          return _context.abrupt("return", result);

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);
          console.log(_context.t0);

        case 10:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
}