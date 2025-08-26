/* c8 ignore start */
/*
|--------------------------------------------------------------------------
| Bouncer policies
|--------------------------------------------------------------------------
|
| You can define a collection of policies inside this file and pre-register
| them when creating a new bouncer instance.
|
| Pre-registered policies and abilities can be referenced as a string instead
| of importing them inside the controllers.
|
*/

export const policies = {
  ApiDatabaseScopePolicy: () => import('#policies/api/api_database_scope_policy'),
}
/* c8 ignore stop */
