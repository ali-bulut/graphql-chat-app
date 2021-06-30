import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  split,
} from "apollo-boost";
import { WebSocketLink } from "apollo-link-ws";
import { getMainDefinition } from "apollo-utilities";
import { getAccessToken } from "../auth";

const httpUrl = "http://localhost:9000/graphql";
const wsUrl = "ws://localhost:9000/graphql";

const httpLink = ApolloLink.from([
  new ApolloLink((operation, forward) => {
    const token = getAccessToken();
    if (token) {
      operation.setContext({ headers: { authorization: `Bearer ${token}` } });
    }
    return forward(operation);
  }),
  new HttpLink({ uri: httpUrl }),
]);

const wsLink = new WebSocketLink({
  uri: wsUrl,
  options: {
    // we can use connectionParams option to pass extra values to the server when
    // establishing a GraphQL WebSocket connection.
    // connectionParams can be either an object or a function returning an object.
    // using a function is useful if the values in the object may change over time
    // and we want to use latest values available when the connection starts.
    connectionParams: () => ({
      accessToken: getAccessToken(),
    }),
    lazy: true,
    reconnect: true,
  },
});

const isSubscription = (operation) => {
  const definition = getMainDefinition(operation.query);
  return (
    definition.kind === "OperationDefinition" &&
    definition.operation === "subscription"
  );
};

const client = new ApolloClient({
  cache: new InMemoryCache(),
  // split is pretending like an if statement. If isSubscription is true then use wsLink if it is not true then use httpLink.
  link: split(isSubscription, wsLink, httpLink),
  defaultOptions: { query: { fetchPolicy: "no-cache" } },
});

export default client;
