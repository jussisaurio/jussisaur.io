const fs = require("fs");
const path = require("path");
const nodeSass = require("node-sass");
const showdown = require("showdown");
const markdownConverter = new showdown.Converter({
  headerLevelStart: 3
});

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const filepath = path.resolve(dir, file);
      if (fs.statSync(filepath).isDirectory()) return cleanDir(filepath);
      fs.unlinkSync(filepath);
    });
    fs.rmdirSync(dir);
  }
}

function copyDir(dir, target) {
  if (fs.existsSync(dir)) {
    fs.mkdirSync(target);
    fs.readdirSync(dir).forEach(file => {
      const filepath = path.resolve(dir, file);
      if (fs.statSync(filepath).isDirectory())
        return copyDir(filepath, path.resolve(target, file));
      fs.writeFileSync(path.resolve(target, file), fs.readFileSync(filepath));
    });
  }
}

function convertMarkdown(path) {
  return markdownConverter.makeHtml(fs.readFileSync(path, "utf8"));
}

const TAGS = {
  TITLE: "siteTitle",
  MAIN_CONTENT: "mainContent",
  STYLE_FILE: "styleFile"
};
const SOURCE_DIR = path.resolve(__dirname, "src");
const STYLE_DIR = path.resolve(SOURCE_DIR, "css");
const DESTINATION_DIR = path.resolve(__dirname, "dist");

cleanDir(DESTINATION_DIR);
fs.mkdirSync(DESTINATION_DIR);

copyDir(
  path.resolve(__dirname, "src", "img"),
  path.resolve(DESTINATION_DIR, "img")
);

const masterStyle = nodeSass.renderSync({
  file: path.resolve(STYLE_DIR, "main.scss"),
  includePaths: [STYLE_DIR]
}).css;

const masterStyleFilename = `style.${Math.random()
  .toString(36)
  .slice(2)}.css`;

fs.mkdirSync(path.resolve(DESTINATION_DIR, "css"));
fs.writeFileSync(
  path.resolve(DESTINATION_DIR, "css", masterStyleFilename),
  masterStyle
);

const filenames = fs.readdirSync(SOURCE_DIR);

const pages = filenames.reduce((acc, filename) => {
  if (filename.endsWith(".tmpl.html")) {
    const targetFilename = filename.replace(".tmpl", "");
    if (!acc[targetFilename]) {
      acc[targetFilename] = {
        targetFilename,
        template: fs.readFileSync(path.resolve(SOURCE_DIR, filename), "utf8")
      };
    } else {
      acc[targetFilename].template = fs.readFileSync(
        path.resolve(SOURCE_DIR, filename),
        "utf8"
      );
    }
  }

  if (filename.endsWith(".content.js")) {
    const targetFilename = filename.replace(".content.js", ".html");
    if (!acc[targetFilename]) {
      acc[targetFilename] = {
        targetFilename,
        content: require(path.resolve(SOURCE_DIR, filename))
      };
    } else {
      acc[targetFilename].content = require(path.resolve(SOURCE_DIR, filename));
    }
  }

  return acc;
}, {});

for (const { targetFilename, content, template } of Object.values(pages)) {
  const contentItems = content.keys
    .map(key => {
      return `
  <div class="menu-item__wrapper">
    <input
      type="radio"
      id="${content.menu[key].title}"
      class="menu-item__selector"
      name="menu-selector"
      ${content.menu[key].selected ? "checked" : ""}
    />
    <label for="${content.menu[key].title}" class="menu-item__content">
      <span class="menu-item__content-text">${content.menu[key].title}</span>
    </label>
    <article class="content-container">
      ${
        content.body[key].markdown
          ? convertMarkdown(
              path.resolve(SOURCE_DIR, content.body[key].markdown)
            )
          : `<h2>${content.body[key].title}</h2>
      ${content.body[key].paragraphs
        .map(paragraph => `<p>${paragraph.text}</p>`)
        .join("\n")}`
      }

    </article>
  </div>
  `;
    })
    .join("");

  const output = template
    .replace(`{{ ${TAGS.STYLE_FILE} }}`, `css/${masterStyleFilename}`)
    .replace(`{{ ${TAGS.TITLE} }}`, content.title)
    .replace(`{{ ${TAGS.MAIN_CONTENT} }}`, contentItems);

  fs.writeFileSync(
    path.resolve(DESTINATION_DIR, targetFilename),
    output,
    "utf8"
  );
}
