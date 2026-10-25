Pod::Spec.new do |s|
  s.name           = 'NuzzleNative'
  s.version        = '1.0.0'
  s.summary        = 'Shares the latest feed with the Apple Watch and Siri, and passes Watch taps to the app.'
  s.author         = 'Philip Nader'
  s.homepage       = 'https://github.com/philipn1-sketch/Game'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'WatchConnectivity'
  s.source_files   = '**/*.swift'
end
