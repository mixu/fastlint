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
      line = line.toString().trim();
      if (line.length > 0) {
        var parts = line.split(/\s+/);
        files.push([parts[0].replace(/\?+/g, 'Q'), path.join(wd, parts[1])]);
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
        files.push([parts[0].replace(/\?+/g, 'Q'), path.join(wd, parts[1])]);
      }
    });
};

exports.filterByStatus = function(files, statuses) {
  if (!statuses) {
    return files;
  }
  var includes = statuses.split('').filter(function(char) { return char.toUpperCase() === char; });
  var excludes = statuses.split('').filter(function(char) { return char.toLowerCase() === char; });

  return files.filter(function(row) {
    var result;
    if (includes.length > 0) {
      result = includes.indexOf(row[0]) !== -1;
    }
    if (excludes.length > 0) {
      result = excludes.indexOf(row[0].toLowerCase()) === -1;
    }
    // console.log(includes, excludes, row[0], result)
    return result;
  });
};

exports.toPaths = function(files) {
  return files.map(function(row) { return row[1]; });
};
