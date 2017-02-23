var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var split = require('binary-split');

exports.findUp = function findUp(filename, opts) {
  opts = opts || {};

  var dir = path.resolve(opts.cwd || '');
  var root = path.parse(dir).root;

  while (true) {
    var fp = path.join(dir, filename);

    try {
      if (fs.statSync(fp)) {
        return fp;
      }
    } catch(e) {}

    if (dir === root) {
      return null;
    }

    dir = path.dirname(dir);
  }
};

function parseStatus(line, wd) {
  // https://git-scm.com/docs/git-status
  var input = line.toString().split('\0')[0]; // only use the first filename in the status
  if (input.length > 0) {
    var x = input.charAt(0); // shows the status of the index
    var y = input.charAt(1); // shows the status of the work tree
    var filepath = input.substr(3);
    var status = x !== ' ' ? x : y; // prefer our modifications to the status since those are more intuitive.
    return {
      status: status.replace(/\?+/g, 'Q'),
      staged: x !== ' ' && x !== '?',
      path: path.join(wd, filepath),
    };
  }
};

// Files modified in the working copy
exports.getWorkingCopy = function getWorkingCopy(wd, onDone) {
  var files = [];
  spawn('git', ['status', '--porcelain', '--untracked-files=normal', '--ignore-submodules=all'], {cwd: wd})
    .once('error', onDone)
    .on('close', function(code) {
      onDone(null, files);
    })
    .stdout.pipe(split())
    .on('data', function(line) {
      var file = parseStatus(line, wd);
      if (file) {
        files.push(file);
      }
    });
};

// Files modified between two commits
exports.getBetweenCommits = function getBetweenCommits(wd, fromCommit, to, onDone) {
  var files = [];
  spawn('git', ['diff-tree', '-r', '--root', '--no-commit-id', '--name-status', fromCommit, to], {cwd: wd})
    .once('error', onDone)
    .on('close', function(code) {
      onDone(null, files);
    })
    .stdout.pipe(split())
    .on('data', function(line) {
      line = line.toString().trim();
      if (line.length > 0) {
        var parts = line.split(/\s+/);
        files.push({
          status: parts[0].replace(/\?+/g, 'Q'),
          staged: true, // committed files are always staged :)
          path: path.join(wd, parts[1]),
        });
      }
    });
};

exports.filterByStaged = function(files, staged) {
  return files.filter(function(file) {
    return file.staged === staged;
  });
};

exports.filterByStatus = function(files, statuses) {
  if (!statuses) {
    return files;
  }
  var includes = statuses.split('').filter(function(char) { return char.toUpperCase() === char; });
  var excludes = statuses.split('').filter(function(char) { return char.toLowerCase() === char; });

  return files.filter(function(file) {
    var result;
    if (includes.length > 0) {
      result = includes.indexOf(file.status) !== -1;
    }
    if (excludes.length > 0) {
      result = excludes.indexOf(file.status.toLowerCase()) === -1;
    }
    return result;
  });
};

exports.toPaths = function(files) {
  return files.map(function(file) { return file.path; });
};
