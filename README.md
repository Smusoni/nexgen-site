# 18x26 NexGen — Football Training Club Website

A static HTML/CSS/JS website for 18x26 NexGen football training academy.

## Quick Start

1. Open `index.html` in your browser, or use any local server:
   ```
   python -m http.server 8080
   ```
   Then visit `http://localhost:8080`

2. To deploy, upload all files to any static hosting provider (Netlify, Vercel, GitHub Pages, etc.)

## Setup Checklist

### Images (Required)

Drop these into the `images/` folder:

| File | Description |
|------|-------------|
| `logo.png` | NexGen logo (transparent background, ~50px tall) |
| `hero-bg.jpg` | Hero background image (1920x1080 or similar) |
| `coach-1.jpg` | Head coach photo |
| `coach-2.jpg` | Assistant coach photo |
| `coach-3.jpg` | Fitness coach photo |
| `coach-bio.jpg` | Coach bio photo for About page |
| `training-action.jpg` | Training action shot for Training page |

### Formspree (Required for forms)

1. Create a free account at [formspree.io](https://formspree.io)
2. Create a new form and copy the form ID
3. Replace `YOUR_FORMSPREE_ID` in these files:
   - `js/booking.js` (line 8)
   - `contact.html` (in the form action attribute)

### Stripe Payment Links (Required for payments)

1. Create a free account at [stripe.com](https://stripe.com)
2. Go to **Payment Links** in the Stripe Dashboard
3. Create a Payment Link for each service:
   - 1-on-1 Session: $110
   - Group 2 Players: $65
   - Group 3-4 Players: $50
   - Group 5-6 Players: $40
4. Replace the `YOUR_*_LINK` placeholders in `js/booking.js` (lines 11-15) with your actual Stripe Payment Link URLs
5. In each Stripe Payment Link, set the **Success URL** to: `https://yourdomain.com/success.html`

### Social Media Links

Update the social media links in the footer of each HTML file. Look for the `footer-social` section and replace `#` with actual URLs.

## File Structure

```
nexgen-site/
  index.html          Home page
  about.html          About page
  training.html       Training methodology
  services.html       Programs & pricing tiers
  book.html           Multi-step booking form
  contact.html        Contact info, form & FAQ
  success.html        Post-payment confirmation
  css/styles.css      All styles
  js/main.js          Shared JS (nav, animations, FAQ)
  js/booking.js       Booking form logic
  images/             Drop your images here
```

## Tech Stack

- Plain HTML5, CSS3, Vanilla JavaScript
- Google Fonts (Oswald + Inter)
- Formspree for form delivery (free tier)
- Stripe Payment Links for payments (no backend needed)
