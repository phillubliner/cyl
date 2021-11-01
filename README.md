# Cyl

## Usage
### Markup
Containers are indicated by the class `cyl`.

Images and captions should be enclosed in a `figure` element.

```
<div class="cyl">
  <figure>
    <img src="..." alt="" />
    <figcaption>
      ...
    </figcaption>
  </figure>
</div>
```

### Javascript
```
import { Cyl } from './cyl'

const cylEls = Array.from(document.querySelectorAll('.cyl'))

cylEls.forEach((el) => {
  const c = new Cyl(el, {
    // hexadecimal only
    backgroundColor: 0x000000,
    debug: false,
  })

  el.querySelector('.controls .left').addEventListener('click', () => {
	  c.prev()
  })

  el.querySelector('.controls .right').addEventListener('click', () => {
    c.next()
  })
})
```
