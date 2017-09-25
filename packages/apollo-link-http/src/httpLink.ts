import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { ApolloFetch, createApolloFetch } from 'apollo-fetch';

import { print } from 'graphql/language/printer';

/** Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export default class HttpLink extends ApolloLink {
  private headers = {};
  private includeExtensions: boolean;
  private _fetch: ApolloFetch;

  constructor(fetchParams?: {
    uri?: string;
    fetch?: ApolloFetch;
    includeExtensions?: boolean;
  }) {
    super();
    this.includeExtensions =
      (fetchParams && fetchParams.includeExtensions) || false;
    this._fetch =
      (fetchParams && fetchParams.fetch) ||
      createApolloFetch({ uri: fetchParams && fetchParams.uri });
    this._fetch.use((request, next) => {
      request.options.headers = {
        ...request.options.headers,
        ...this.headers,
      };
      next();
    });
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    const { headers } = operation.getContext();
    this.headers = headers || {};
    const { operationName, variables, query, extensions } = operation;
    const request = {
      operationName,
      variables,
      query: print(query),
    } as any;

    if (this.includeExtensions) request.extensions = extensions;

    return new Observable<FetchResult>(observer => {
      this._fetch(request)
        .then(data => {
          if (!observer.closed) {
            observer.next(data);
            observer.complete();
          }
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  }
}