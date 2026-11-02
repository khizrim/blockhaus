/* Patches applied to node_modules after every install (npm ci or install).

   react-native-view-shot 4.0.3 imports RCTScrollView, which React Native
   0.88 no longer ships, so the iOS build fails. The class is only used for
   the snapshotContentContainer option, which the app never passes; the
   check becomes a plain UIScrollView one. Remove this once view-shot
   supports RN 0.88. Safe to run twice. */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-native-view-shot', 'ios', 'RNViewShot.mm');
if (fs.existsSync(file)) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace('#import <React/RCTScrollView.h>\n', '');
  s = s.replace(
    /if \(!\[view isKindOfClass:\[RCTScrollView class\]\]\) \{[\s\S]*?RCTScrollView\* rctScrollView = view;\n\s*scrollView = rctScrollView\.scrollView;/,
    'if (![view isKindOfClass:[UIScrollView class]]) {\n        reject(RCTErrorUnspecified, [NSString stringWithFormat:@"snapshotContentContainer needs a scroll view, got: %@", view], nil);\n        return;\n      }\n      scrollView = (UIScrollView*)view;',
  );
  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log('patch-native: react-native-view-shot patched for RN 0.88');
  }
}
