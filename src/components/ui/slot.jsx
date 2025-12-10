import * as React from "react"

const Slot = React.forwardRef(({ children, ...props }, ref) => {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      ref: (node) => {
        if (ref) {
          if (typeof ref === "function") {
            ref(node)
          } else {
            ref.current = node
          }
        }
        if (children.ref) {
          if (typeof children.ref === "function") {
            children.ref(node)
          } else {
            children.ref.current = node
          }
        }
      },
    })
  }
  return React.createElement("div", { ...props, ref }, children)
})
Slot.displayName = "Slot"

export { Slot }
