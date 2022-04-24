const [pad, margin] = [1000, 1000];
const [size, broke] = [500, 5];
const [min, max] = [1, 5];
const initial = 2;

const error = {
    file: './assets/error.jpg',
    avatar: './assets/error.jpg',
    display: 'Error',
    user: 'server',
    link: '/',
    text: ''
}

const get = id => new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState !== XMLHttpRequest.DONE) return;
        if (xmlhttp.status !== 200) return reject();
        try {
            let res = JSON.parse(xmlhttp.responseText);
            get.next = res.last;
            resolve(res.files);
        } catch (err) {
            reject(err);
        }
    }
    let url = `https://178.116.73.195:443/hsc/${id}/${get.next || ''}`;
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
})

window.onload = () => {
    const container = (id, ...items) => {
        let el = document.querySelector(id);
        items.forEach(s => el[s] = el.querySelector('.' + s));
        return el;
    }

    const list = container('#list', 'input', 'cancel', 'view', 'error');
    const info = container('#info', 'avatar', 'user', 'display', 'description');
    const controls = container('#controls', 'heart', 'scroll', 'minus', 'plus', 'list');
    const content = (e => (e.down = 0, e))(document.querySelector('#content'));

    const col = (e => () => (e => (e.up = 0, e))(e.cloneNode()))(document.querySelector('.col'));
    const move = (c, v) => (c.up += v, c.style.transform = `translateY(${content.down - c.up}px)`);
    const child = (c, d) => d < 0 ? c.firstElementChild : c.lastElementChild;

    const height = (c, d) => {
        let e = child(c, d);
        if (!e) return 0;
        let ratio = NaN;
        if (e.tagName === 'IMG') ratio = e.naturalHeight / e.naturalWidth;
        if (e.tagName === 'VIDEO') ratio = e.videoHeight / e.videoWidth;
        if (isNaN(ratio)) ratio = (e.clientHeight / e.clientWidth) || 1;
        return Math.round(ratio * c.clientWidth);
    }

    const set = () => {
        let e = document.elementFromPoint(50, 50);
        if (!['IMG', 'VIDEO'].includes(e.tagName)) e = null;
        let i = items.findIndex(i => i.file === e.file);
        let [l, u] = ((i < 0) && (i = 0), [i, i - 1]);
        const b = i => (i => i < 0 ? i + items.length : i)(i % items.length);
        const m = (d, n) => d < 0 ? l = b(l - n) : u = b(u + n);

        const pop = (d, e) => {
            let [o] = [d < 0 ? l : u, m(d,  -1)];
            let i = items.findIndex(i => i.file === e.file);
            if (i >= 0 && i !== o) (items[i] = items[o], items[o] = e);
            return e;
        }

        const push = (d, cb, r) => {
            let down = d < 0 && l > 0;
            let up = d >= 0 && u < items.length - 1;
            const add = e => e.includes('.mp4') ? vid(e, cb) : img(e, cb);
            const play = e => cb(e.tagName === 'VIDEO' ? (e.play(), e) : e);
            const copy = e => play(e.parentElement ? Object.assign(e.cloneNode(true), e) : e);
            const get = (l, i) => !l[i].e ? l[i] = Object.assign(add(l[i].file), { e: true }, l[i]) : copy(l[i]);
            if (r || down || up) (m(d, 1), get(items, d < 0 ? l : u));
            else request(d, () => (push(d, cb, true)));
        }

        const request = (d, cb) => {
            let broken = items.filter(i => i.file === error.file).length;
            if (items.length >= size || broken >= broke) return cb();
            const err = () => (items.push(error), cb());
            get(id()).then(res => {
                let s = res?.length;
                if (!s) return err();
                if (d > 0) items.push(...res);
                else items.unshift(...res);
                if (d < 0) l += s, u += s;
                cb();
            }, err);
        }

        const vid = (src, cb) => {
            let s = document.createElement('source');
            let v = document.createElement('video');
            const set = s => {
                v.setAttribute(s, '');
                v[s] = true;
            }
            s.src = src;
            set('muted');
            set('loop');
            set('autoplay');
            v.oncanplay = () => {
                v.oncanplay = undefined;
                clearTimeout(t);
                cb(v)
            }
            let t = setTimeout(() => {
                if (!v.oncanplay) return;
                v.oncanplay();
            }, 1000);
            v.append(s);
            return v;
        }
        
        const img = (src, cb) => {
            let i = document.createElement('img');
            i.onload = () => {
                i.onload = undefined;
                clearTimeout(t);
                cb(i);
            }
            let t = setTimeout(() => {
                if (!i.onload) return;
                i.onload();
            }, 1000);
            i.src = src;
            return i;
        }

        const fill = (cols, cb) => {
            if (removed()) return cb();

            const shift = (col, d, e) => {
                let [up, down] = [col.up, content.down];
                let scroll = (shuffle ? col : content).scrollTop;
                let shift = d < 0 ? height(col, -1): 0;
                if (d < 0) child(col, -1).remove();
                else col.prepend(e);
                col.up = height(col, -1);
                if (shuffle) up = col.up;
                let diff = up - (d < 0 ? col.up + shift : 0);
                if (shuffle) return col.scrollTop = scroll + diff;
                content.down = Math.max(...cols.map(c => c.up));
                content.scrollTop = scroll + content.down - down + diff;
                cols.forEach(c => move(c, c === col ? 0 : -diff));
            }

            const add = (col, d) => push(d, e => {
                if (removed()) return cb();
                d < 0 ? shift(col, 1, e) : col.append(e);
                requestAnimationFrame(() => fill(cols, cb));
            })

            const remove = (col, d) => {
                let remove = pop(d, child(col, d));
                d < 0 ? shift(col, -1) : remove.remove();
                requestAnimationFrame(() => fill(cols, cb));
            }

            let [m, f, c, d] = [0];
            cols.forEach(col => {
                let top = content.scrollTop - content.down + col.scrollTop + col.up;
                let bot = col.scrollHeight - content.clientHeight - top;
                let rt = top - pad - margin - height(col, -1);
                let rb = bot - pad - margin - height(col, 1);
                let [at, ab] = [pad - top, pad - bot];
                const i = (...l) => l.includes(v);
                let v = Math.max(rt, rb, at, ab);
                if (m >= v && (m || v)) return;
                d = i(ab, rb) ? 1 : -1;
                f = i(d > 0 ? ab : at) ? add : remove;
                c = col;
                m = v;
            })
            if (f) f(c, d);
            else cb();
        }

        content.down = 0;
        content.innerHTML = '';
        const cols = [...Array(n).keys()].map(col);
        let [filling, removed] = [false, () => !cols[0].parentElement];
        const f = c => filling || (filling = true, fill(c, () => filling = false));
        cols.forEach(c => c.onscroll = () => f([c]));
        content.onscroll = () => f(cols);
        window.onresize = () => f(cols);
        content.append(...cols);
        f(cols);

        controls.scroll.onclick = () => {
            filling = true;
            shuffle = !shuffle;
            query(shuffle, n);
            if (shuffle) {
                let scroll = content.scrollTop - content.down;
                content.classList.add('shuffle');
                content.down = 0;
                cols.forEach(c => {
                    c.scrollTop = scroll + c.up;
                    move(c, -c.up);
                })
            }
            else {
                const scroll = c => Math.round(c.scrollTop);
                content.down = Math.max(...cols.map(scroll));
                cols.forEach(c => move(c, scroll(c) - c.up));
                content.classList.remove('shuffle');
                content.scrollTop = content.down;
            }
            filling = false;
        }
    }

    const id = () => {
        let id = window.location.search.split('/')[1];
        if (!/^\d+$/.test(id)) return '';
        return id;
    }

    const query = (shuffle, n = 0) => {
        n = Math.abs(n) * (shuffle ? -1 : 1);
        if (n) window.history.replaceState(null, '', `/?${n}/${id()}`);
        let i = parseInt(window.location.search.slice(1).split('/')[0]) || initial;
        n = Math.min(max, Math.max(min, Math.abs(i)));
        controls.minus.disabled = n === min;
        controls.plus.disabled = n === max;
        return [i < 0, n];
    }

    const toggle = (e, el) => {
        if (!e) el = document.body;
        else el = document.elementFromPoint(e.clientX, e.clientY);
        if (el === document.body) el = el.firstElementChild;
        if (!['IMG', 'VIDEO'].includes(el.tagName)) return;
        if (el.parentElement === document.body) {
            if (e && history.state) return history.back();
            el.onanimationend = () => el.remove();
            return el.classList.add('pop');
        }

        const f = (p => n => Math.round(n * p) / p)(1000);
        const set = (p, v, s = 'px') => c.style.setProperty('--' + p, f(v) + s);
        let [cw, ch, s, w, h, x, y] = [content.clientWidth, content.clientHeight];
        let [c, r, o] = [el.cloneNode(true), el.getBoundingClientRect(), () => (s - 1) / 2];
        if (c.tagName === 'VIDEO') (c.currentTime = el.currentTime, c.muted = true);
        set('s', s = Math.max(r.width / cw, r.height / ch), '');
        set('w', w = r.width / s), set('h', h = r.height / s);
        set('x', x = (cw - w) / 2), set('y', y = (ch - h) / 2);
        set('l', r.left + w * o()), set('t', r.top + h * o());

        info.href = el.link;
        info.avatar.src = el.avatar;
        info.display.innerHTML = el.display;
        info.user.innerHTML = '@' + el.user;
        info.description.innerHTML = el.text;
        document.body.prepend(c);

        window.history.pushState(true, '', '/' + window.location.search);
    }

    document.onclick = e => toggle(e);
    window.onpopstate = () => toggle();

    controls.list.onclick = () => {
        list.classList.add('show');
    }

    list.cancel.onclick = () => {
        requestAnimationFrame(() => list.classList.remove('show'));
    }

    list.view.onclick = () => {
        let inp = list.input.value.slice('https://twitter.com/i/lists/'.length);
        let id = inp.slice(0, (i => i < 0 ? undefined : i)(inp.search(/[^\d]/)));
        if (!id.length) list.error.classList.add('show');
        else window.location.href = '/?/' + id;
    }

    controls.minus.onclick = () => {
        if (n === min) return;
        n = Math.max(min, n - 1);
        query(shuffle, n);
        set();
    }

    controls.plus.onclick = () => {
        if (n === max) return;
        n = Math.min(max, n + 1);
        query(shuffle, n);
        set();
    }

    controls.heart.onclick = () => {
        controls.classList.toggle('open');
    }

    if (!id()) {
        list.cancel.disabled = true;
        list.classList.add('show');
        return;
    }

    let [shuffle, n] = query();
    if (shuffle) content.classList.add('shuffle');
    let items = [];
    set();
}
