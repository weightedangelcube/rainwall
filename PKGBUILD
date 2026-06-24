pkgname=rainwall-git
pkgver=r47.c87b8dd
pkgrel=1
pkgdesc="Apply a wallpaper based on the weather outside"
arch=('any')
url="https://github.com/weightedangelcube/rainwall"
license=('GPL-3.0-only')
depends=('imagemagick' 'bash')
makedepends=('git' 'deno')
provides=("${pkgname%-git}")
conflicts=("${pkgname%-git}")
source=('git+https://github.com/weightedangelcube/rainwall.git')
options=(!strip)
b2sums=('SKIP')

pkgver() {
	cd "$srcdir/${pkgname%-git}"
	printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short=7 HEAD)"
}

prepare() {
    cd "$srcdir/${pkgname%-git}"
    deno install
}

build() {
    cd "$srcdir/${pkgname%-git}"
    deno compile --output build/rainwall-analyze -A src/analyze/index.ts
    deno compile --output build/rainwall-apply -A src/apply/index.ts
}

package() {
	cd "$srcdir/${pkgname%-git}"
	install -Dm755 "build/${pkgname%-git}-analyze" -t "$pkgdir/usr/bin"
    install -Dm755 "build/${pkgname%-git}-apply" -t "$pkgdir/usr/bin"

    install -Dm644 README.md -t "$pkgdir/usr/share/doc/${pkgname%-git}"
}
