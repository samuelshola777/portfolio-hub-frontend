# Portfolio Hub Frontend

## Responsive workspace update

- Desktop dashboard expands into comfortable two-column editing layouts.
- Mobile dashboard uses a single section selector, larger inputs and touch-friendly actions.
- The Start page shows portfolio completion, skills, projects and publish status at a glance.
- Public portfolio style controls remain separate from dashboard light/dark mode.
- Background items and skills can be edited without deleting and recreating them.
- Certifications have a dedicated desktop section and mobile setup step with issuer, credential ID, issue/expiry dates, verification URL and certificate proof upload.
- Background thumbnails and Devicon-based skill icons upload directly inside their forms.
- Skills are grouped by category in both the dashboard and public portfolio.
- Project gallery media supports previous/next navigation, keyboard controls and a thumbnail strip.

Local API settings are included in `.env.local`. Change `NEXT_PUBLIC_API_URL` before deploying to Vercel.

## Administration data loading

- The user directory performs debounced server-side search and loads 20 accounts per page.
- Account activity is fetched from its own paginated endpoint rather than being embedded in the analytics response.
- The user detail screen shows account and portfolio fields, including empty values, and lazily loads projects, background, skills, links, enquiries, analytics events, files, businesses, business content, orders, enquiries, and activity one page at a time.
- The verification resend control is locked during requests and shows the server cooldown countdown.

This Next.js application routes professional accounts to the existing portfolio workspace and business-owner
accounts to a separate multi-business workspace. Business websites are published at `/business/{businessSlug}`.

The business workspace includes a business switcher, guided pages and sections, desktop/tablet/mobile previews,
light and dark previews, catalogs, media uploads, orders, enquiries and settings. Public business sites include
catalog pagination, order requests, enquiry forms and a remembered visitor theme.

Set `NEXT_PUBLIC_API_URL` in `.env.local` for local development and in Vercel for production.

Independent Next.js 16 frontend for the Portfolio Hub application. This project contains no Spring Boot or database source and can be maintained in its own Git repository and deployed directly to Vercel.

## Requirements

- Node.js 22.13 or newer
- A deployed Portfolio Hub Spring Boot API

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

The application runs at `http://localhost:3000`.

The in-app guide is available at `http://localhost:3000/guide`. After login, the Start tab provides a five-step checklist and the user can copy their public `/{username}` link from any dashboard screen.

Configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:9999
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
```

## Available commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run format
npm run format:check
npm start
```

## Vercel deployment

1. Push this frontend folder to its own GitHub repository.
2. Import that repository into Vercel.
3. Add `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`.
4. Add `NEXT_PUBLIC_SUPPORT_EMAIL=you@example.com`.
5. Deploy.
6. Add the final Vercel URL to the backend's `FRONTEND_URL` and `ALLOWED_ORIGINS` environment variables.

## Backend integration

All calls are sent to `NEXT_PUBLIC_API_URL`. Private requests include the JWT as `Authorization: Bearer <accessToken>`.

Files are uploaded as multipart data to:

```text
POST /api/v1/utilities/private/file/upload
```

The frontend includes the access token. Uploads are available only to active, email-verified accounts; the returned `data.fileUrl` is then used in the portfolio, project or business request.

The upload screen includes type/size validation, previews, live progress and cancellation. Profile images, CVs and introduction videos are attached to the portfolio automatically; project uploads expose their returned URL for the case-study form.

## User and recruiter flow

1. Register with a unique email and username, then verify the email.
2. Follow the Start checklist to add a profile, optional background, skills, case studies and files.
3. Publish the portfolio and copy the public link or QR code.
4. Recruiters can visit all supplied project, credential, website and social links, download a CV/PDF, view media and send an enquiry.
5. The owner can review analytics and enquiries from the dashboard.

Empty experience, education, certification, achievement and skills sections are not rendered on the public portfolio.

## Free assisted setup

Visitors can request setup help at `/assisted-setup`, where the contact field is explicitly the active WhatsApp number with country code. Super administrators manage requests and create or update portfolios at `/admin/setup`. The downloadable workbook is available at `/portfolio-hub-assisted-setup-template.xlsx`; no AI or paid extraction service is required.

## Portfolio styles

The public portfolio includes three fully responsive layouts: Orbit, Editorial and Spatial. The owner chooses and saves the default in Dashboard → Profile. Visitors can preview another style instantly from the public navigation; this preview only updates the `?theme=` URL and does not overwrite the owner's saved preference. Theme rules live in `app/portfolio-themes.css` and are scoped to `.public-v2`, keeping authentication, dashboard and administration layouts isolated.
