import { Cyl } from './cyl'

const cylEls = Array.from(document.querySelectorAll('.cyl'))

cylEls.forEach((el) => {
	const c = new Cyl(el, {
    backgroundColor: 0x000000,
		debug: false,
  })

	// c.next(), c.prev()

	console.log(c)
})