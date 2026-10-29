<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Mandatory Quality, Security & Testing Protocol (بروتوكول الاختبار والجودة الإلزامي)

Whenever modifying existing code or adding new features to this repository, the agent MUST strictly execute the following testing and verification routine before finishing:

1. **Code Quality & Type Verification**:
   - Run `npm run lint` and ensure 0 errors.
   - Run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
   - Run `npm run build` and ensure all static pages compile cleanly to `out/`.

2. **Mobile Responsiveness & Viewports**:
   - Verify layout responsiveness across mobile viewports (360px - 430px).
   - Ensure `overflow-x: hidden` is preserved with no horizontal layout shifts.
   - Ensure touch targets meet the minimum 48x48px requirement.
   - Ensure safe area insets (`env(safe-area-inset-bottom)`) and bottom spacing (`pb-16 md:pb-0`) prevent UI collision with `BottomTabBar`.

3. **Security & Data Integrity**:
   - Ensure Firestore rules (`firestore.rules`) protect against client price tampering, maintain atomic stock deduction (`stock >= 0`), and enforce status restrictions.
   - Ensure zero secrets or sensitive credentials are ever committed (respect `.gitignore`).
   - Validate form inputs with anti-spam / rate-limiting where applicable.

4. **CI/CD & Deployment Safety**:
   - Ensure changes pass GitHub Actions (`CI`, `Security Scan`, `Lighthouse CI`).
   - NEVER deploy to production (`firebase deploy`) without explicit confirmation from the user.
