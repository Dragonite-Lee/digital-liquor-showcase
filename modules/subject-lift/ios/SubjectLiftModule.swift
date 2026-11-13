import CoreImage
import ExpoModulesCore
import UIKit
import Vision

public class SubjectLiftModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLift")

    Function("isAvailable") { () -> Bool in
      #if targetEnvironment(simulator)
      return false
      #else
      if #available(iOS 17.0, *) {
        return true
      }
      return false
      #endif
    }

    AsyncFunction("liftSubject") { (uri: String) -> [String: Any] in
      guard #available(iOS 17.0, *) else {
        throw Exception(name: "ERR_SUBJECT_LIFT_UNSUPPORTED", description: "Subject lifting needs iOS 17 or later")
      }
      return try SubjectLifter.lift(uri: uri)
    }
  }
}

@available(iOS 17.0, *)
enum SubjectLifter {
  static let maxSide: CGFloat = 1400

  static func lift(uri: String) throws -> [String: Any] {
    let parsed = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
    guard let url = parsed,
      let source = CIImage(contentsOf: url, options: [.applyOrientationProperty: true])
    else {
      throw Exception(name: "ERR_SUBJECT_LIFT_LOAD", description: "Could not read the photo")
    }

    let handler = VNImageRequestHandler(ciImage: source, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])

    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      throw Exception(name: "ERR_SUBJECT_LIFT_EMPTY", description: "No subject found in the photo")
    }

    // 여러 물체가 잡히면 화면 가운데에 있는 것만 고른다. 가운데가 배경이면 전부 쓴다.
    var instances = observation.allInstances
    if let center = centerInstance(of: observation.instanceMask), instances.contains(center) {
      instances = IndexSet(integer: center)
    }

    let buffer = try observation.generateMaskedImage(
      ofInstances: instances,
      from: handler,
      croppedToInstancesExtent: true
    )

    var output = CIImage(cvPixelBuffer: buffer)
    let longest = max(output.extent.width, output.extent.height)
    if longest > maxSide {
      let scale = maxSide / longest
      output = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    }

    let context = CIContext()
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
      let png = context.pngRepresentation(of: output, format: .RGBA8, colorSpace: colorSpace)
    else {
      throw Exception(name: "ERR_SUBJECT_LIFT_ENCODE", description: "Could not encode the cutout")
    }

    let target = FileManager.default.temporaryDirectory
      .appendingPathComponent("lift-\(UUID().uuidString).png")
    try png.write(to: target, options: .atomic)

    return [
      "uri": target.absoluteString,
      "width": Int(output.extent.width.rounded()),
      "height": Int(output.extent.height.rounded())
    ]
  }

  private static func centerInstance(of mask: CVPixelBuffer) -> Int? {
    CVPixelBufferLockBaseAddress(mask, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }

    guard CVPixelBufferGetPixelFormatType(mask) == kCVPixelFormatType_OneComponent8,
      let base = CVPixelBufferGetBaseAddress(mask)
    else {
      return nil
    }
    let width = CVPixelBufferGetWidth(mask)
    let height = CVPixelBufferGetHeight(mask)
    let rowBytes = CVPixelBufferGetBytesPerRow(mask)
    let value = base.load(fromByteOffset: (height / 2) * rowBytes + width / 2, as: UInt8.self)
    return value == 0 ? nil : Int(value)
  }
}
