/**
 * English message catalog.
 *
 * All UI-facing strings live here. Keys are flat dot-paths grouped by feature
 * area (`common.*`, `auth.*`, `nav.*`, ...). Use `{name}` placeholders for
 * interpolation — the `t()` helper substitutes them at render time.
 *
 * The `vi` catalog imports `typeof en` so TypeScript enforces every locale to
 * cover the same keys.
 */
export const en = {
    // Generic actions / states shared across the app.
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.submit": "Submit",
    "common.back": "Back",
    "common.next": "Next",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.processing": "Processing...",
    "common.saving": "Saving...",
    "common.sending": "Sending...",
    "common.updating": "Updating...",
    "common.search": "Search",
    "common.required": "Required",
    "common.optional": "Optional",
    "common.confirm": "Confirm",
    "common.continue": "Continue",
    "common.invalidEmail": "Invalid email format",
    "common.passwordTooShort": "Password must be at least 8 characters",
    "common.passwordsNoMatch": "Passwords don't match",

    // Navigation chrome — guest + user navbar.
    "nav.login": "Sign in",
    "nav.register": "Sign up",
    "nav.logout": "Sign out",
    "nav.profile": "Profile",
    "nav.dashboard": "Dashboard",

    // Login page.
    "auth.login.title": "Welcome back!",
    "auth.login.email": "Email",
    "auth.login.emailPlaceholder": "you@example.com",
    "auth.login.password": "Password",
    "auth.login.passwordPlaceholder": "••••••••",
    "auth.login.forgotPassword": "Forgot password?",
    "auth.login.submit": "Sign in",
    "auth.login.continueGoogle": "Continue with Google",
    "auth.login.noAccount": "Don't have an account yet?",
    "auth.login.registerNow": "Sign up now",
    "auth.login.testCredsTitle": "(Test Only):",
    "auth.login.invalidCredentials": "Invalid email or password",
    "auth.login.googleFailed": "Google sign-in failed. Please try again.",
    "auth.login.googleTokenMissing": "Google sign-in did not return an access token.",
    "auth.login.googleTokenInvalid": "Google sign-in returned an invalid token.",
    "auth.login.signInGeneric": "Unable to complete sign-in. Please try again.",
    "auth.login.unexpectedError": "An unexpected error occurred!",
    "auth.login.showPassword": "Show password",
    "auth.login.hidePassword": "Hide password",

    // Register page.
    "auth.register.title": "Create your account",
    "auth.register.subtitle": "Get started in less than a minute",
    "auth.register.firstName": "First name",
    "auth.register.lastName": "Last name",
    "auth.register.firstNamePlaceholder": "John",
    "auth.register.lastNamePlaceholder": "Doe",
    "auth.register.email": "Email",
    "auth.register.password": "Password",
    "auth.register.confirmPassword": "Confirm password",
    "auth.register.submit": "Create account",
    "auth.register.success": "Account created. Check your inbox to verify your email.",
    "auth.register.failed": "Registration failed",
    "auth.register.alreadyHaveAccount": "Already have an account?",
    "auth.register.logIn": "Sign in",

    // Forgot password page.
    "auth.forgot.title": "Forgot your password?",
    "auth.forgot.subtitle": "Enter your email and we'll send a reset link.",
    "auth.forgot.submit": "Send reset link",
    "auth.forgot.success": "If an account exists, a reset link has been sent.",
    "auth.forgot.failed": "Could not send reset email",
    "auth.forgot.checkInbox": "Check your inbox for the reset link.",
    "auth.forgot.linkExpires": "The link will expire in 15 minutes.",
    "auth.forgot.rememberPassword": "Remembered your password?",

    // Reset password page (same route, token present).
    "auth.reset.title": "Set a new password",
    "auth.reset.subtitle": "Enter and confirm your new password.",
    "auth.reset.newPassword": "New password",
    "auth.reset.confirmPassword": "Confirm password",
    "auth.reset.submit": "Update password",
    "auth.reset.success": "Password reset successful! Please log in.",
    "auth.reset.failed": "Password reset failed",
    "auth.reset.invalidLink": "Invalid password reset link.",

    // Post-register / check-your-email page.
    "auth.checkEmail.title": "Check your email",
    "auth.checkEmail.sentTo": "We sent a verification link to",
    "auth.checkEmail.instructions": "Click the link in the email to activate your account. The link expires in 15 minutes.",
    "auth.checkEmail.resend": "Resend verification email",
    "auth.checkEmail.resending": "Sending...",
    "auth.checkEmail.resendCooldown": "Resend in {seconds}s",
    "auth.checkEmail.resendSuccess": "Verification email sent. Please check your inbox.",
    "auth.checkEmail.resendFailed": "Could not resend the email. Try again later.",
    "auth.checkEmail.alreadyVerified": "Already verified?",

    // Profile / settings.
    "profile.title": "Profile",
    "profile.language.title": "Language",
    "profile.language.description": "Choose the language used across the app.",
    "profile.language.label": "Display language",

    // Language names — used by the LanguageSwitcher.
    "language.en": "English",
    "language.vi": "Tiếng Việt",
} as const;

export type MessageKey = keyof typeof en;
// Other locales must cover the same keys but values are free-form strings.
export type Messages = Record<MessageKey, string>;
