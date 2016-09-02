var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

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
  exec(['git', 'status', '--porcelain', '--untracked-files=all', '--ignore-submodules=all'].join(' '), {cwd: wd}, function(err, stdout, stderr) {
    if (err) {
      return onDone(err);
    }
    var files = stdout.split('\n').filter(Boolean).map(function(line) {
      line = line.trim();
      var parts = line.split(/\s+/);
      return [parts[0].replace(/\?+/g, 'Q'), path.join(wd, parts[1])];
    });
    onDone(err, files);
  });
};

// Files modified between two commits
exports.getBetweenCommits = function getBetweenCommits(wd, fromCommit, to, onDone) {
  exec(['git', 'diff-tree', '-r', '--root', '--no-commit-id', '--name-status', fromCommit, to].join(' '), {cwd: wd}, function(err, stdout, stderr) {
    if (err) {
      return onDone(err);
    }
    var files = stdout.split('\n').filter(Boolean).map(function(line) {
      var parts = line.split(/\s+/);
      return [parts[0].replace(/\?+/g, 'Q'), path.join(wd, parts[1])];
    });
    onDone(err, files);
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
