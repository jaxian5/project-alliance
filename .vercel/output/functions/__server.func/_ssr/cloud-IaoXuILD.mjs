import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cloud-IaoXuILD.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getCloudStatus_createServerFn_handler = createServerRpc({
	id: "2e4e2e783bb246870e6097d089aae873244479144435124771cdcd69f7a7d623",
	name: "getCloudStatus",
	filename: "src/alliance/cloud.ts"
}, (opts) => getCloudStatus.__executeServer(opts));
var getCloudStatus = createServerFn({ method: "GET" }).handler(getCloudStatus_createServerFn_handler, async () => {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	return { ready: Boolean(url && key) };
});
//#endregion
export { getCloudStatus_createServerFn_handler };
