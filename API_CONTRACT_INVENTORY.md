# API Contract Inventory

This inventory is the API baseline for FitTrack clients.
Consumers should depend on these endpoint contracts rather than
implicit UI behavior.

## Auth

- `POST /api/auth/signup`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/otp/send`
- `POST /api/auth/verification/resend`
- `GET /api/auth/onboarding-status`
- `GET /api/auth/[...nextauth]` and `POST /api/auth/[...nextauth]` (legacy web session)

## Meals

- `GET /api/meals?date=YYYY-MM-DD`
- `POST /api/meals`
- `GET /api/meals/:id`
- `DELETE /api/meals/:id`
- `POST /api/analyze-meal`
- `POST /api/ai/estimate-meal`
- `GET /api/ai/estimates`
- `GET /api/ai/estimates/:id`

## Workout

- `GET /api/workout?date=YYYY-MM-DD`
- `POST /api/workout`
- `GET /api/workout/:id`
- `PATCH /api/workout/:id`
- `DELETE /api/workout/:id`

## Weight And Hydration

- `GET /api/weight?range=7d|30d`
- `POST /api/weight`
- `PATCH /api/weight/:id`
- `DELETE /api/weight/:id`
- `GET /api/hydration`
- `POST /api/hydration`
- `GET /api/hydration/week`

## Goals, Settings, And User

- `GET /api/settings/goals`
- `PUT /api/settings/goals`
- `GET /api/settings/phone`
- `PUT /api/settings/phone`
- `POST /api/settings/phone/verify/send`
- `POST /api/settings/phone/verify/confirm`
- `GET /api/user/logging-streak`

## Billing

- `GET /api/billing/status`
- `POST /api/billing/checkout`
- `POST /api/billing/verify`
- `POST /api/billing/portal`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/razorpay`

## Analytics And Insights

- `GET /api/analytics/summary`
- `GET /api/weekly-report`
- `GET /api/insight`
- `POST /api/coach`
- `POST /api/ai/coach`

## Utility

- `GET /api/food`
- `GET /api/food/from-barcode`
- `GET /api/export`
- `POST /api/import`
- `GET /api/admin/status`
- `GET /api/internal/ai-costs`
- `GET /api/internal/ai-costs/users/:userId`
