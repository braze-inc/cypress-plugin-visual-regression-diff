module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        releaseRules: [
          { type: "chore", scope: "deps", release: "patch" },
          { type: "docs", release: "patch" },
        ],
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    "@semantic-release/changelog",
    [
      "@semantic-release/exec",
      {
        prepareCmd: "yarn prepack",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: [
          "dist/**/*.{js,mjs,map}",
          "LICENSE",
          "Readme.md",
          "package.json",
        ],
      },
    ],
  ],
  preset: "angular",
};
