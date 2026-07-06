# ============================================
# XPower Nutrition Project Structure
# ============================================

$folders = @(
"src/app",
"src/app/(public)",
"src/app/(public)/products",
"src/app/(public)/categories",
"src/app/(public)/brands",
"src/app/(public)/offers",
"src/app/(public)/cart",
"src/app/(public)/checkout",
"src/app/(public)/profile",
"src/app/(public)/orders",
"src/app/(public)/contact",
"src/app/(public)/about",

"src/app/admin",
"src/app/admin/dashboard",
"src/app/admin/products",
"src/app/admin/categories",
"src/app/admin/brands",
"src/app/admin/orders",
"src/app/admin/users",
"src/app/admin/coupons",
"src/app/admin/reviews",
"src/app/admin/banners",
"src/app/admin/analytics",
"src/app/admin/settings",

"src/app/api",

"src/assets",
"src/assets/icons",
"src/assets/images",
"src/assets/banners",
"src/assets/fonts",

"src/components",
"src/components/ui",
"src/components/common",

"src/config",

"src/constants",

"src/features",

"src/features/auth",
"src/features/auth/components",
"src/features/auth/hooks",
"src/features/auth/services",
"src/features/auth/types",
"src/features/auth/validators",

"src/features/products",
"src/features/products/components",
"src/features/products/hooks",
"src/features/products/services",
"src/features/products/types",
"src/features/products/validators",

"src/features/cart",
"src/features/cart/components",
"src/features/cart/hooks",
"src/features/cart/services",
"src/features/cart/types",

"src/features/checkout",
"src/features/checkout/components",
"src/features/checkout/hooks",
"src/features/checkout/services",
"src/features/checkout/validators",

"src/features/orders",
"src/features/orders/components",
"src/features/orders/hooks",
"src/features/orders/services",
"src/features/orders/types",

"src/features/dashboard",
"src/features/dashboard/components",
"src/features/dashboard/hooks",
"src/features/dashboard/services",
"src/features/dashboard/types",

"src/features/users",
"src/features/users/components",
"src/features/users/hooks",
"src/features/users/services",
"src/features/users/types",

"src/features/reviews",
"src/features/coupons",
"src/features/banners",
"src/features/analytics",
"src/features/settings",

"src/hooks",

"src/lib",

"src/services",
"src/services/firebase",
"src/services/storage",
"src/services/api",

"src/store",

"src/styles",

"src/types",

"src/utils",

"src/validators"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created: $folder" -ForegroundColor Green
    }
    else {
        Write-Host "Exists : $folder" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "XPower Folder Structure Created ✔" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan