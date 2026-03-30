# Mobile Responsive Design Testing Guide

## Quick Testing Instructions

### Using Browser DevTools

1. **Open the application** in your browser
2. **Open DevTools** (F12 or Right-click → Inspect)
3. **Toggle Device Toolbar** (Ctrl+Shift+M or Cmd+Shift+M)
4. **Test these viewports**:

#### iPhone SE (375px)
- Set dimensions to 375 x 667
- Verify:
  - ✓ Header displays with all controls accessible
  - ✓ Wallet address visible in mobile info row
  - ✓ Navigation items wrap and are tappable (44x44px minimum)
  - ✓ Forms stack vertically
  - ✓ Token cards show all information
  - ✓ No horizontal scrollbar
  - ✓ Modals fit on screen

#### iPad (768px)
- Set dimensions to 768 x 1024
- Verify:
  - ✓ Layout transitions smoothly
  - ✓ Navigation in single row
  - ✓ Forms use space efficiently
  - ✓ Token cards show more details

#### Desktop (1280px)
- Set dimensions to 1280 x 720
- Verify:
  - ✓ Full layout with all features
  - ✓ Optimal horizontal space usage
  - ✓ All hover states work

### Manual Testing Checklist

#### Header (All Viewports)
- [ ] Title is readable and doesn't overflow
- [ ] Theme toggle button is accessible (44x44px)
- [ ] Wallet connect/disconnect button works
- [ ] Language and network switchers visible on desktop, hidden on mobile

#### Navigation (All Viewports)
- [ ] All nav links are tappable (44x44px minimum)
- [ ] Active state is clearly visible
- [ ] Navigation wraps properly on mobile
- [ ] Help button shows "?" on mobile, full text on desktop

#### Forms (All Viewports)
- [ ] Input fields are at least 44px tall
- [ ] Labels are readable
- [ ] Buttons are tappable (44x44px minimum)
- [ ] Form fields stack vertically on mobile
- [ ] Error messages display properly

#### Token Cards (All Viewports)
- [ ] All information is visible
- [ ] Addresses truncate properly
- [ ] Copy buttons work (44x44px)
- [ ] "View details" link is accessible
- [ ] Cards don't overflow horizontally

#### Modals (All Viewports)
- [ ] Modal fits on screen
- [ ] Close button is accessible (44x44px)
- [ ] Content scrolls if needed
- [ ] Buttons are tappable
- [ ] Modal doesn't cause horizontal scroll

### Touch Target Verification

Use this bookmarklet to highlight elements smaller than 44x44px:

```javascript
javascript:(function(){document.querySelectorAll('button,a,input,select,textarea').forEach(el=>{const rect=el.getBoundingClientRect();if(rect.width<44||rect.height<44){el.style.outline='3px solid red';}});})();
```

### Responsive Breakpoints

The app uses Tailwind's default breakpoints:
- **Mobile**: < 640px (no prefix)
- **sm**: ≥ 640px (tablet)
- **md**: ≥ 768px (small desktop)
- **lg**: ≥ 1024px (desktop)

### Common Issues to Check

1. **Horizontal Overflow**
   - Scroll horizontally on each page
   - Should never see horizontal scrollbar

2. **Text Overflow**
   - Long addresses should truncate or wrap
   - Buttons should not have text overflow

3. **Touch Targets**
   - All interactive elements should be at least 44x44px
   - Buttons should have adequate spacing

4. **Form Usability**
   - Inputs should be easy to tap
   - Labels should be clearly associated
   - Error messages should be visible

5. **Navigation**
   - All pages should be accessible
   - Active state should be clear
   - Back button should work

### Testing with Real Devices

If possible, test on actual devices:
- iPhone SE or similar (375px width)
- iPad or Android tablet (768px width)
- Desktop browser (1280px+ width)

### Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Ensure focus is visible
   - Verify logical tab order

2. **Screen Reader**
   - Test with NVDA (Windows) or VoiceOver (Mac)
   - Verify all buttons have labels
   - Check form field associations

3. **Color Contrast**
   - Verify text is readable in both light and dark modes
   - Check button states are distinguishable

## Automated Testing

To run automated tests (if available):

```bash
cd frontend
npm run test
```

## Performance Testing

Check performance on mobile:
1. Open DevTools → Lighthouse
2. Select "Mobile" device
3. Run audit
4. Check for:
   - Performance score > 90
   - Accessibility score > 90
   - Best Practices score > 90

## Reporting Issues

If you find responsive design issues, please report:
1. Viewport size where issue occurs
2. Screenshot or screen recording
3. Steps to reproduce
4. Expected vs actual behavior

## Development Tips

When making future changes:
1. Always test on mobile first (mobile-first approach)
2. Use responsive classes: `sm:`, `md:`, `lg:`
3. Ensure touch targets are 44x44px minimum
4. Test on multiple viewport sizes
5. Check for horizontal overflow
6. Verify text doesn't overflow containers
