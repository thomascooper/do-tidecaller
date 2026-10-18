# Getting Tidecaller into search engines

Your steps, in order. Nothing here costs money. The site must already be serving at
https://tidecaller.drunkenoath.com (the GoDaddy CNAME is in place and Vercel shows the domain as
valid).

## 1. Google Search Console

Use a Domain property if you want the whole of drunkenoath.com covered (every module of the
family). Use a URL-prefix property if you only want Tidecaller.

### Option A: Domain property (TXT record at GoDaddy)

1. Open https://search.google.com/search-console and sign in.
2. Click the property menu at the top left, then **Add property**.
3. Choose **Domain**, type `drunkenoath.com`, click **Continue**.
4. Copy the TXT record value Google shows (starts with `google-site-verification=`).
5. Open https://dcc.godaddy.com/domains, click `drunkenoath.com`, then **DNS**.
6. Click **Add New Record**. Type **TXT**, Name **@**, Value the string you copied, TTL default. Click **Save**.
7. Back in Search Console click **Verify**. If it says the record is not found yet, wait 10 minutes and try again (DNS can take up to a day).

### Option B: URL-prefix property for the subdomain

1. In Search Console click the property menu, then **Add property**.
2. Choose **URL prefix**, type `https://tidecaller.drunkenoath.com/`, click **Continue**.
3. Pick the **HTML tag** method and copy the meta tag it shows. Tell the next session to add it to the site head (it is a code change, so it goes through a branch and your merge). Or pick **Domain name provider** and use the same TXT record steps as Option A.
4. Click **Verify** once the change is live.

## 2. Submit the sitemap

1. In Search Console choose your property, then **Sitemaps** in the left menu.
2. Under **Add a new sitemap** type `sitemap.xml` and click **Submit**.
3. Status should change to **Success**. If it says "Couldn't fetch", wait a few minutes and reload.

## 3. Request indexing of the key pages

1. Click the search bar at the top (**Inspect any URL**), paste `https://tidecaller.drunkenoath.com/` and press Enter.
2. When the report loads, click **Request indexing**. Wait for the confirmation.
3. Repeat for `https://tidecaller.drunkenoath.com/bis`.

Google limits these requests per day; the sitemap covers every other page.

## 4. Bing Webmaster Tools

1. Open https://www.bing.com/webmasters and sign in.
2. Click **Import** (import your sites from Google Search Console), sign in to Google when asked and allow access.
3. Tick `tidecaller.drunkenoath.com` (or the Domain property) and click **Import**. The sitemap comes across with it.
4. If the import is not offered, click **Add a site** instead, enter the URL, and verify with the DNS TXT record the same way as step 1.

## 5. Vercel Web Analytics

1. Open https://vercel.com, switch to the **EQL Max** team, and open the **tidecaller** project.
2. Click the **Analytics** tab, then **Enable**.
3. Visit the live site once. Page views show up within a few minutes.

Tidecaller only loads the analytics script on production builds, and the About page tells visitors
that anonymous page views are counted without cookies. Check your Vercel plan: the free tier has a
monthly event cap, and going over it is when cost could appear.

## What to watch in the first month

- **Week 1:** Sitemaps shows Success; **Pages** (Indexing) starts listing URLs. A few days of "Discovered, currently not indexed" is normal for a new site.
- **Weeks 2 to 4:** the number of indexed pages climbs toward the full route count (the sitemap lists them all). Pages stuck as "Crawled, currently not indexed" after three weeks are worth telling a session about.
- **Performance** report: impressions and clicks by query. Early impressions on searches such as "resto shaman best in slot" or "restoration shaman stat weights" are the signal that matters; clicks follow.
- **Pages** report: any "Excluded by noindex" on a production URL is a bug (only previews should be noindex).
- **Core Web Vitals** and **Mobile usability**: should be clean, since pages are static HTML.
- **Vercel Analytics:** which pages get visits, and whether the calculator (`/`) is the entry point or the BiS page is.
- **Bing Webmaster Tools:** the same checks on **Sitemaps** and **Search Performance**.
