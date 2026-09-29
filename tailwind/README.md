# Rebuilding the site CSS

The site loads a pre-built stylesheet, `Assets/css/dccpa.css`, instead of the Tailwind
CDN script (which is slower and not meant for production).

Tailwind only includes the classes that are actually used in `index.html`. If you add a
class it hasn't seen before, rebuild the stylesheet (Node.js required):

```bash
cd tailwind
npx tailwindcss@3 -c tailwind.config.js -i input.css -o ../Assets/css/dccpa.css --minify
```

Then commit the updated `Assets/css/dccpa.css`. If a new class shows no styling, this
step was usually skipped.
