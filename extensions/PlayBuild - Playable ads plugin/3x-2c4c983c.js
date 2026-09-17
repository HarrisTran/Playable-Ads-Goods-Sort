"use strict";
var e = require("electron"),
  r = require("child_process"),
  t = require("os"),
  o = require("fs"),
  a = require("path"),
  n = require("./playbuild-core.js");
function i(e) {
  return e && "object" == typeof e && "default" in e ? e : { default: e };
}
var l = i(r),
  c = i(t);
const { exec: s, execSync: d } = l.default;
var u = {
  run: function (e, r) {
    return s(e, function (e, t, o) {
      r && r(e, t, o);
    });
  },
  runSync: function (e) {
    try {
      return { data: d(e).toString(), err: null, stderr: null };
    } catch (e) {
      return {
        data: null,
        err: e.stderr.toString(),
        stderr: e.stderr.toString(),
      };
    }
  },
};
const p = "playbuild",
  f = () => {
    const e = `${Editor.Project.path}/.adapterrc`;
    return o.existsSync(e)
      ? JSON.parse(((r = e), o.readFileSync(r).toString(t)))
      : null;
    var r, t;
  },
  h = () => {
    const e = Editor.Project.path,
      r = "/build",
      t = f();
    let o = t?.buildPlatform ?? "web-mobile";
    return {
      projectRootPath: e,
      projectBuildPath: r,
      buildPlatform: o,
      originPkgPath: a.join(e, r, o),
      adapterBuildConfig: t,
    };
  },
  g = () => {
    const e = f();
    return !!e && (e.skipBuild ?? !1);
  };
var P = require("path").join(__dirname + "/3x-4f10520a.js");
const m = (e) =>
    new Promise((r, t) => {
      let o = Editor.App.path;
      const a = (() => {
        const e = c.default.platform();
        return "win32" === e
          ? "WINDOWS"
          : "darwin" === e
          ? "MAC"
          : e.toUpperCase();
      })();
      "MAC" === a
        ? (o = o.replace("/Resources/app.asar", "/MacOS/CocosCreator"))
        : "WINDOWS" === a
        ? (o = ((e) => {
            let r = e;
            return -1 !== r.indexOf("\\") && (r = r.replace(/\\/g, "/")), r;
          })(o).replace("/resources/app.asar", "/CocosCreator.exe"))
        : t(`No support for ${a} platform builds`);
      u.run(
        `${o} --project ${Editor.Project.path} --build "platform=${e}"`,
        (e, t, o) => {
          console.log(e, t, o), r();
        }
      ).stdout.on("data", (e) => {
        console.log(e);
      });
    }),
  j = async (e) => {
    console.log(`${p} for pre-build processing`), console.log(`${p} Skip pre-build processing`);
  },
  b = (e) =>
    new Promise(async (r, t) => {
      const {
          projectRootPath: o,
          projectBuildPath: i,
          adapterBuildConfig: l,
        } = h(),
        c = a.join(o, i);
      console.info(`${p} Start adapting, export platform ${e.platform}`);
      const s = new Date().getTime(),
        d = () => {
          const e = new Date().getTime();
          console.log(`${p} The adaptation is complete, it took ${((e - s) / 1e3).toFixed(0)} seconds.`),
            r(!0);
        },
        u = (e) => {
          console.error("adaptation failure"), t(e);
        },
        f = {
          buildFolderPath: c,
          adapterBuildConfig: { ...l, buildPlatform: e.platform },
        };
      try {
        ((e, r, t) => {
          const { Worker: o } = require("worker_threads");
          console.log("Worker support, will turn on sub-thread adaptation"),
            new o(P, { workerData: e }).on(
              "message",
              ({ finished: e, msg: o, event: a }) => {
                "adapter:finished" !== a
                  ? console[a.split(":")[1]](o)
                  : e
                  ? r()
                  : t(o);
              }
            );
        })(f, d, u);
      } catch (e) {
        console.log("Worker is not supported, will turn on main thread adaptation"),
          await n.exec3xAdapter(f, { mode: "serial" }),
          d();
      }
    });
(exports.BUILDER_NAME = p),
  (exports.builder3x = async () => {
    try {
      const { buildPlatform: r, projectRootPath: t, projectBuildPath: o } = h();
      console.log(`Start building the project, exporting the ${r} package`);
      const n = g(),
        i = a.join(t, o);
      await j(),
        n || (await m(r)),
        await b({ platform: r }),
        e.shell.openPath(i),
        console.log("Finish building");
    } catch (e) {
      console.error(e);
    }
  }),
  (exports.initBuildFinishedEvent = b),
  (exports.initBuildStartEvent = j);
