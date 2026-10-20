// jQuery ships no types and the viewer only needs the object itself.
declare module "jquery" {
  const jQuery: unknown;
  export default jQuery;
}
