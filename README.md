# Activity Monitor (Fixed)

A Melvor Idle mod that monitors and tracks player activity.

## Building

Dependencies are required for building. Install them with:

```bash
npm install
```

**1. Webpack (`npm run pack`)**

Webpack compiles and minifies all source files, writing the output to the `dist/` directory. Static files (`manifest.json`, `assets/`, `libs/`, `ui/styles.css`) are copied across as-is.

**2. Zip (`npm run zip`)**

The contents of `dist/` are archived into a `.zip` file placed in the `package/` directory. The output file is named `{package-name}.{id}.zip`, where `{id}` is a short unique identifier. Any previously generated zips in `package/` are deleted, leaving only the latest one.

The resulting zip in `package/` is the distributable mod file.
