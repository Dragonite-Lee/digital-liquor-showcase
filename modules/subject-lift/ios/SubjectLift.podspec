Pod::Spec.new do |s|
  s.name           = 'SubjectLift'
  s.version        = '1.0.0'
  s.summary        = 'Lift the main subject out of a photo with Apple Vision'
  s.description    = 'Local Expo module: foreground instance mask (iOS 17+) to transparent PNG'
  s.license        = 'MIT'
  s.author         = 'Dragonite-Lee'
  s.homepage       = 'https://github.com/Dragonite-Lee/digital-liquor-showcase'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/Dragonite-Lee/digital-liquor-showcase.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
