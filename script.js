Pts.quickStart("#pt", "#ece8ff");

const moods = ["neutral", "happy", "sleepy", "confused"];
let moodIndex = 0;

let ctrls = [];
let baseRadius = 140;

const moodStyles = {
    neutral: {
        body: "#5a33ff",
        accent: "#ff4fa1",
        wobble: 10,
        speed: 0.0016,
        pupilRange: 8
    },
    happy: {
        body: "#7b4dff",
        accent: "#ff4fa1",
        wobble: 14,
        speed: 0.0022,
        pupilRange: 10
    },
    sleepy: {
        body: "#6d73ff",
        accent: "#ff8db8",
        wobble: 5,
        speed: 0.001,
        pupilRange: 4
    },
    confused: {
        body: "#4e26db",
        accent: "#ff5ca8",
        wobble: 16,
        speed: 0.0025,
        pupilRange: 12
    }
};

function updateBaseShape() {
    baseRadius = Math.min(space.size.x, space.size.y) / 3.8;
    ctrls = Create.radialPts(space.center, baseRadius, 12, -Const.half_pi);
}

function pointFromAngle(center, angle, radius) {
    return new Pt(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius
    );
}

function getBlobPoints(time, pointer) {
    const mood = moods[moodIndex];
    const style = moodStyles[mood];
    const temp = ctrls.clone();

    for (let i = 0; i < temp.length; i++) {
        const p = temp[i];
        const angle = p.$subtract(space.center).angle();

        let wobble =
            Math.sin(time * style.speed + i * 0.8) * style.wobble +
            Math.cos(time * style.speed * 1.4 + i * 0.45) * (style.wobble * 0.45);

        const pull = pointer.$subtract(space.center);
        const pullAngle = pull.angle();
        const pointerInfluence =
            Math.cos(angle - pullAngle) * Math.min(pull.magnitude() / 120, 8);

        if (mood === "confused") {
            wobble += Math.sin(time * 0.003 + i * 1.7) * 4;
        }

        if (mood === "sleepy" && p.y > space.center.y) {
            wobble += 6;
        }

        const r = baseRadius + wobble + pointerInfluence;
        temp[i].to(pointFromAngle(space.center, angle, r));
    }

    temp.push(temp.p1, temp.p2, temp.p3);
    return temp;
}

function getEyeCenters(center) {
    return {
        left: center.$add(-42, -32),
        right: center.$add(42, -32)
    };
}

function getPupilPosition(eyeCenter, pointer, range) {
    let dir = pointer.$subtract(eyeCenter);

    if (dir.magnitude() > range) {
        dir = dir.unit().$multiply(range);
    }

    return eyeCenter.$add(dir);
}

function drawEyes(center, pointer, mood) {
    const style = moodStyles[mood];
    const eyes = getEyeCenters(center);

    if (mood === "sleepy") {
        form.stroke("#ffffff", 6, "round");
        form.line([eyes.left.$add(-15, 0), eyes.left.$add(15, 0)]);
        form.line([eyes.right.$add(-15, 0), eyes.right.$add(15, 0)]);
        return;
    }

    let eyeWidth = 18;
    let eyeHeight = 20;

    if (mood === "happy") {
        eyeWidth = 19;
        eyeHeight = 18;
    } else if (mood === "confused") {
        eyeWidth = 17;
        eyeHeight = 22;
    }

    form.fillOnly("#ffffff");
    form.ellipse(eyes.left, [eyeWidth, eyeHeight], 0);
    form.ellipse(eyes.right, [eyeWidth, eyeHeight], 0);

    const leftPupil = getPupilPosition(eyes.left, pointer, style.pupilRange);
    const rightPupil = getPupilPosition(eyes.right, pointer, style.pupilRange);

    form.fillOnly("#141427");
    form.point(leftPupil, 6, "circle");
    form.point(rightPupil, 6, "circle");

    if (mood === "confused") {
        form.stroke("#ffffff", 4, "round");
        form.line([eyes.left.$add(-12, -18), eyes.left.$add(8, -22)]);
        form.line([eyes.right.$add(-8, -22), eyes.right.$add(12, -18)]);
    }
}

function drawMouth(center, pointer, mood) {
    const style = moodStyles[mood];
    const mouthY = center.y + 42;

    const left = new Pt(center.x - 56, mouthY);
    const right = new Pt(center.x + 56, mouthY);
    let mid = new Pt(center.x, mouthY);

    if (mood === "happy") {
        mid = new Pt(center.x, mouthY + 24);
    } else if (mood === "sleepy") {
        mid = new Pt(center.x, mouthY + 3);
    } else if (mood === "confused") {
        mid = new Pt(center.x + 14, mouthY - 12);
    } else {
        const d = center.$subtract(pointer).magnitude();
        const curve = Math.min(Math.max((d - 90) / 10, -8), 16);
        mid = new Pt(center.x, mouthY + curve);
    }

    form.stroke(style.accent, 10, "round");
    form.line([left, mid]);
    form.line([mid, right]);

    if (mood === "happy") {
        form.fillOnly("#ff4fa1");
        form.point(center.$add(-82, 10), 16, "circle");
        form.point(center.$add(82, 10), 16, "circle");
    }
}

function drawMoodLabel(mood) {
    form.fillOnly("rgba(31,31,31,0.75)");
    form.font(16, "Arial");
    form.text([24, 34], "Mood: " + mood);
}

function drawBackgroundGlow(center, pointer) {
    const dist = Math.min(center.$subtract(pointer).magnitude(), 220);
    const glowSize = 160 + (220 - dist) * 0.5;

    form.fill("rgba(90,51,255,0.08)");
    form.point(center, glowSize, "circle");
}

space.add({
    start: () => {
        updateBaseShape();
    },

    animate: (time) => {
        const mood = moods[moodIndex];
        const style = moodStyles[mood];
        const pointer = space.pointer.clone();

        const blobAnchors = getBlobPoints(time, pointer);
        const blobCurve = Curve.bspline(blobAnchors, 10);
        const center = blobAnchors.centroid();

        drawBackgroundGlow(center, pointer);

        form.fillOnly(style.body);
        form.polygon(blobCurve);

        drawEyes(center, pointer, mood);
        drawMouth(center, pointer, mood);
        drawMoodLabel(mood);
    },

    action: (type) => {
        if (type === "up") {
            moodIndex = (moodIndex + 1) % moods.length;
        }
    },

    resize: () => {
        updateBaseShape();
    }
});

space.bindMouse().bindTouch().play();