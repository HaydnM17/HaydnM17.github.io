/* Haydn McIntyre — site behaviour. No dependencies. */
(function () {
  "use strict";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = motionQuery.matches;
  var heroField = null; // the canvas exposes go/stop here once it is set up

  /* Pause every CSS animation while the tab is in the background. */
  document.addEventListener("visibilitychange", function () {
    document.body.classList.toggle("paused", document.hidden);
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- Email, assembled at runtime so it is not sitting in the markup ---- */
  var mailUser = ["haydn", "mcintyre"].join("");
  var mailHost = ["yahoo", "ca"].join(".");
  var EMAIL = mailUser + "@" + mailHost;

  document.querySelectorAll("[data-mail]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + EMAIL);
  });

  /* ---- Sticky bar goes solid once you leave the hero --------------------- */
  var topbar = document.getElementById("topbar");
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle("is-stuck", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile menu ------------------------------------------------------ */
  var toggle = document.querySelector(".menu-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  if (toggle && mobileNav) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileNav.hidden = !open;
    };
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---- Hero line field ---------------------------------------------------
     A grid of short strokes that drift on their own and swing to circle the
     pointer as it passes. Same line language as the rules under the headings. */
  (function () {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var running = false, frame = 0, start = 0;

    var GAP = 44;      // px between strokes
    var LEN = 13;      // resting length of one stroke
    var REACH = 250;   // how far the pointer's influence carries

    var cursor = { x: 0, y: 0, on: false };
    var glow = document.getElementById("hero-cursor");

    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var paint = function (elapsed) {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      for (var x = GAP / 2; x < w + GAP; x += GAP) {
        for (var y = GAP / 2; y < h + GAP; y += GAP) {
          /* two out-of-step waves give a slow, non-repeating drift */
          var angle = Math.sin(x * 0.011 + elapsed * 0.16) * 0.9 +
                      Math.cos(y * 0.013 - elapsed * 0.12) * 0.9;
          var lit = 0;

          if (cursor.on) {
            var dx = cursor.x - x;
            var dy = cursor.y - y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < REACH) {
              lit = 1 - d / REACH;
              lit = lit * lit;
              /* swing tangential to the pointer, so the field circles it */
              var around = Math.atan2(dy, dx) + Math.PI / 2;
              var diff = Math.atan2(Math.sin(around - angle), Math.cos(around - angle));
              angle += diff * lit;
            }
          }

          var len = LEN * (1 + lit * 1.1);
          var cx = Math.cos(angle) * len * 0.5;
          var cy = Math.sin(angle) * len * 0.5;

          if (lit > 0.04) {
            ctx.strokeStyle = "rgba(229, 180, 87, " + (0.18 + lit * 0.72).toFixed(3) + ")";
            ctx.lineWidth = 1 + lit * 0.9;
          } else {
            ctx.strokeStyle = "rgba(236, 241, 236, 0.20)";
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(x - cx, y - cy);
          ctx.lineTo(x + cx, y + cy);
          ctx.stroke();
        }
      }
    };

    var step = function (t) {
      paint((t - start) / 1000);
      if (running) frame = requestAnimationFrame(step);
    };

    var still = function () { paint(0); };

    var stop = function () {
      running = false;
      cancelAnimationFrame(frame);
    };

    var go = function () {
      if (running || reduceMotion) return;
      running = true;
      start = performance.now();
      frame = requestAnimationFrame(step);
    };

    size();
    if (reduceMotion) { still(); } else { go(); }

    /* ---- Pointer ----------------------------------------------------------
       The canvas is pointer-events:none so it never eats clicks, so track on
       the window and translate into canvas space. */
    if (!reduceMotion) {
      var track = function (e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var pad = 60; // keep responding just past the edges
        cursor.on = x > -pad && x < rect.width + pad && y > -pad && y < rect.height + pad;
        cursor.x = x;
        cursor.y = y;
        if (glow) {
          glow.style.setProperty("--cx", x + "px");
          glow.style.setProperty("--cy", y + "px");
          glow.classList.toggle("on", cursor.on);
        }
      };

      var clear = function () {
        cursor.on = false;
        if (glow) glow.classList.remove("on");
      };

      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("pointerdown", track, { passive: true });
      /* only a finger lifting ends it — a mouse click should not */
      window.addEventListener("pointerup", function (e) {
        if (e.pointerType === "touch") clear();
      }, { passive: true });
      window.addEventListener("pointercancel", clear, { passive: true });
      document.addEventListener("pointerleave", clear);
      window.addEventListener("scroll", clear, { passive: true });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        size();
        if (reduceMotion) still();
      }, 150);
    });

    /* don't burn frames on a hero nobody is looking at */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) go();
          else stop();
        });
      }, { threshold: 0 }).observe(canvas);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else go();
    });

    heroField = { go: go, stop: stop, still: still };
  })();

  /* ---- Reduced motion, honoured live and in both directions --------------
     Someone can flip the OS setting with the page already open. Flipping in
     pins everything to its finished state; flipping back out re-arms it. */
  (function () {
    var pin = function () {
      document.querySelectorAll(".reveal, .head-anim, .bolt-rule, .rise").forEach(function (el) {
        el.classList.add("is-in");
      });
      if (heroField) { heroField.stop(); heroField.still(); }
    };

    var release = function () {
      if (heroField) heroField.go();
    };

    var onChange = function (e) {
      reduceMotion = e.matches;
      if (e.matches) pin();
      else release();
    };

    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onChange);
    else if (motionQuery.addListener) motionQuery.addListener(onChange);
  })();

  /* ---- Lightbox ---------------------------------------------------------
     Click a project image to blow it up. Close with the X, Escape, or by
     clicking the backdrop. <dialog> gives us Escape and focus trapping free. */
  (function () {
    var dialog = document.getElementById("lightbox");
    var big = document.getElementById("lightbox-img");
    var close = document.getElementById("lightbox-close");
    if (!dialog || !big || !close || typeof dialog.showModal !== "function") return;

    var opener = null;

    var open = function (img) {
      opener = img.closest(".zoom");
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      dialog.showModal();
      document.body.classList.add("is-locked");
      close.focus();
    };

    var shut = function () {
      if (dialog.open) dialog.close();
    };

    document.querySelectorAll(".zoom").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var img = btn.querySelector("img");
        if (img) open(img);
      });
    });

    close.addEventListener("click", shut);

    /* a click that lands on the dialog itself is a click on the backdrop */
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) shut();
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("is-locked");
      big.removeAttribute("src");
      big.alt = "";
      if (opener) {
        opener.focus();
        opener = null;
      }
    });
  })();

  /* ---- Headings rise word by word ---------------------------------------
     Split into words, keep the original text on aria-label so screen readers
     read the heading normally rather than a pile of spans. */
  document.querySelectorAll(".h2").forEach(function (h) {
    var text = h.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;
    h.setAttribute("aria-label", text);
    h.classList.add("head-anim");
    h.textContent = "";
    text.split(" ").forEach(function (word, i) {
      var outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--wd", i * 60 + "ms");
      outer.appendChild(inner);
      h.appendChild(outer);
      h.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- Scroll progress --------------------------------------------------- */
  var bar = document.getElementById("progress-bar");
  if (bar) {
    var ticking = false;
    var paint = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(Math.max(pct, 0), 1).toFixed(4) + ")";
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ---- Section rail + nav highlighting ----------------------------------- */
  (function () {
    var rail = document.getElementById("rail");
    if (!rail || !("IntersectionObserver" in window)) return;

    var links = Array.prototype.slice.call(rail.querySelectorAll("a"));
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll(".nav a:not(.nav-cta)")
    );

    var setActive = function (id) {
      links.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-sec") === id);
      });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-current", a.getAttribute("href") === "#" + id);
      });
    };

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    links.forEach(function (a) {
      var section = document.getElementById(a.getAttribute("data-sec"));
      if (section) spy.observe(section);
    });
  })();

  /* ---- Cursor spotlight on cards ----------------------------------------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".project, .layer").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
      }, { passive: true });
    });
  }

  /* ---- Scroll reveals --------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    document.querySelectorAll(".reveal, .head-anim, .bolt-rule").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal, .head-anim, .bolt-rule").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Contact form ----------------------------------------------------- */
  var form = document.getElementById("enquiry");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submit = form.querySelector(".btn-submit");

  var showError = function (input, show) {
    var msg = form.querySelector('.err[data-for="' + input.id + '"]');
    if (msg) msg.hidden = !show;
    if (show) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  var validate = function () {
    var ok = true;
    var first = null;
    ["f-name", "f-email", "f-msg"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var bad = !input.value.trim() || (input.type === "email" && !input.checkValidity());
      showError(input, bad);
      if (bad && !first) first = input;
      if (bad) ok = false;
    });
    if (first) first.focus();
    return ok;
  };

  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true") showError(e.target, false);
  });

  var setStatus = function (text, state) {
    if (!status) return;
    status.textContent = text;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      setStatus("Check the highlighted fields.", "bad");
      return;
    }

    var data = new FormData(form);

    /* No form service wired up yet — hand it to their mail app instead. */
    if (form.action.indexOf("YOUR_FORM_ID") !== -1) {
      var body =
        "Name: " + data.get("name") + "\n" +
        "Email: " + data.get("email") + "\n\n" +
        data.get("message");
      window.location.href =
        "mailto:" + EMAIL +
        "?subject=" + encodeURIComponent("Message from " + data.get("name")) +
        "&body=" + encodeURIComponent(body);
      setStatus("Opening your email app with the message ready to send.");
      return;
    }

    submit.disabled = true;
    setStatus("Sending...");

    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        form.reset();
        setStatus("Sent. Thanks — I'll get back to you.", "ok");
      })
      .catch(function () {
        setStatus("That did not send. You can email me instead.", "bad");
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
