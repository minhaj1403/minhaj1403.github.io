// The showcase: the app's bottom bar drives a sliding strip of screenshots.
// It cycles on its own until you take over.
(function () {
  "use strict";

  var track  = document.getElementById("track");
  var bar    = document.querySelector(".tabbar");
  var tabs   = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));

  if (!track || !bar || !tabs.length) return;

  var DWELL  = 2000;                 // ms each tab stays up
  var calm   = window.matchMedia("(prefers-reduced-motion: reduce)");
  var index  = 0;
  var timer  = null;
  var paused = false;
  var manual = false;                // set once the visitor picks a tab

  function show(i) {
    index = (i + tabs.length) % tabs.length;

    track.style.transform = "translateX(" + (-25 * index) + "%)";

    tabs.forEach(function (t, n) {
      var on = n === index;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      // restart the sliver cleanly on every change
      t.classList.remove("is-timing");
      if (on && !manual && !paused && !calm.matches) {
        void t.offsetWidth;
        t.classList.add("is-timing");
      }
    });

    panels.forEach(function (p, n) {
      p.classList.toggle("is-on", n === index);
    });
  }

  function tick() { if (!paused) show(index + 1); }

  function play() {
    stop();
    if (manual || calm.matches) return;
    bar.style.setProperty("--dwell", DWELL + "ms");
    timer = setInterval(tick, DWELL);
    show(index);                     // re-arm the sliver
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function takeOver(i) {
    manual = true;
    stop();
    tabs.forEach(function (t) { t.classList.remove("is-timing"); });
    show(i);
  }

  tabs.forEach(function (t, n) {
    t.addEventListener("click", function () { takeOver(n); });
  });

  // Left/right arrows move between tabs, as a tablist should.
  bar.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    takeOver(e.key === "ArrowRight" ? index + 1 : index - 1);
    tabs[index].focus();
    e.preventDefault();
  });

  // Hold still while someone is reading or pointing at it.
  function hold()   { paused = true;  stop(); tabs.forEach(function (t) { t.classList.remove("is-timing"); }); }
  function resume() { paused = false; if (!manual) play(); }

  bar.addEventListener("mouseenter", hold);
  bar.addEventListener("mouseleave", resume);
  bar.addEventListener("focusin", hold);
  bar.addEventListener("focusout", resume);

  document.addEventListener("visibilitychange", function () {
    document.hidden ? hold() : resume();
  });

  // Only run while the showcase is actually on screen.
  var section = document.getElementById("features");
  if (section && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? resume() : hold();
    }, { threshold: 0.25 }).observe(section);
  } else {
    play();
  }

  show(0);
})();
