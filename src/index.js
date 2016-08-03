const boot = require('./boot');
const React = require('react');
const ReactDOM = require('react-dom');
const Controller = require('./components/Controller');
const Errors = require('./components/Errors');
const profiles = {
  'react': require('./profiles/react'),
  'react-router': require('./profiles/react-router'),
};

const errorMessages = [];
const userConfigFiles = require.context("../runner", false, /\.\/index\.js$/);
const autoConfigFiles = require.context("../tmp", false, /\.\/context\.js$/);
const rawContext = loadContext();
const context = decorateContext(rawContext);
const profile = profiles[context.profile];
const hasValidContext = profile && typeof context.subject === 'function';

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    if (hasValidContext) {
      guard(function() { profile.stop(context); });
    }
  });

  module.hot.accept([ './profiles/react', './profiles/react-router' ], function() {
    if (hasValidContext) {
      guard(function() { profile.stop(context); });
      guard(function() { startProfile(); });
    }
  });
}

boot(function() {
  if (!rawContext) {
    errorMessages.push("You must set up the runner context either through the UI or a file.");
  }
  else if (!context.profile) {
    errorMessages.push("You have not specified a profile.");
  }
  else if (!profile) {
    errorMessages.push(
      `Profile '${context.profile}' is invalid, it must be one of: ` +
      `${Object.keys(profiles).join(', ')}.`
    );
  }

  renderErrors();
  renderController();

  if (hasValidContext) {
    guard(function() {
      startProfile();
    });
  }
});

function startProfile() {
  profile.start(context, function(error) {
    errorMessages.push(error);
    renderErrors();
  });
}

function renderErrors() {
  ReactDOM.render(<Errors errorMessages={errorMessages} />, document.querySelector('#mirage-errors'));
}

function renderController() {
  ReactDOM.render(<Controller {...context} />, document.querySelector('#mirage-controller'));
}

function loadContext() {
  const userConfig = userConfigFiles.keys().reduce(function(map, file) {
    map[file.replace(/^\.\/|\.js$/g, '')] = userConfigFiles(file);
    return map;
  }, {});

  const autoConfig = autoConfigFiles.keys().reduce(function(map, file) {
    map[file.replace(/^\.\/|\.js$/g, '')] = autoConfigFiles(file);
    return map;
  }, {});

  if (userConfig['index'] && userConfig['index'].enabled !== false) {
    return userConfig['index'];
  }
  else {
    return autoConfig['context'];
  }
}

function decorateContext(context) {
  return Object.assign({}, context, {
    rootElement: document.querySelector('#component')
  });
}

function guard(fn) {
  try {
    fn();
  }
  catch(error) {
    errorMessages.push({
      message: "Runtime error:",
      stack: error.stack
    });

    renderErrors();

    console.warn("Profile error:");
    console.warn(error && error.stack || error);
  }
}