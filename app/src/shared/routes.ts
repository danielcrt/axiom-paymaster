type Route = "home" | "prove" | "success" | "fail";

export const RouteSignature: Record<Route, string> = {
  home: "/",
  prove: "/prove",
  success: "/success",
  fail: "/fail",
};

export const Routes = {
  home: RouteSignature.home,
  prove: RouteSignature.prove,
  success: RouteSignature.success,
  fail: RouteSignature.fail,
};
