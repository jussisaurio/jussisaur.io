const fs = require("fs");
const path = require("path");

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

const TAGS = {
  TITLE: "siteTitle",
  MAIN_CONTENT: "mainContent"
};
const SOURCE_DIR = path.resolve(__dirname, "src");
const DESTINATION_DIR = path.resolve(__dirname, "dist");

cleanDir(DESTINATION_DIR);
fs.mkdirSync(DESTINATION_DIR);

copyDir(
  path.resolve(__dirname, "src", "img"),
  path.resolve(DESTINATION_DIR, "img")
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
  <label class="menu-item__wrapper">
    <input
      type="radio"
      class="menu-item__selector"
      name="menu-selector"
      ${content.menu[key].selected ? "checked" : ""}
    />
    <div class="menu-item__content">
      <span class="menu-item__content-text">${content.menu[key].title}</span>
    </div>
    <article class="content-container">
      <h2>${content.body[key].title}</h2>
      ${content.body[key].paragraphs
        .map(paragraph => `<p>${paragraph.text}</p>`)
        .join("\n")}
    </article>
  </label>
  `;
    })
    .join("");

  const output = template
    .replace(`{{ ${TAGS.TITLE} }}`, content.title)
    .replace(`{{ ${TAGS.MAIN_CONTENT} }}`, contentItems);

  fs.writeFileSync(
    path.resolve(DESTINATION_DIR, targetFilename),
    output,
    "utf8"
  );
}
