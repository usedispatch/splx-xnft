# xnft-quickstart

Quickstart repo for building your own xNFT.

## Developing

Once you've installed Backpack, get started building your xNFT with these steps. Note that the packages here will always use the latest, which correspond to the latest tagged build of Backpack. If you have unexepected issues, make sure your package versions match the app version.

Further documentation: https://docs.xnfts.dev/getting-started/getting-started

### Install

First, install dependencies.

```
yarn
```

### Run the dev server

Then, run the dev server with hot reloading

```
yarn dev
```

### Open the Simulator in Backpack

Now that you have your xNFT dev server running, open it in the Backpack simulator to see it run.

That's it!


## Build & Publish

Once you're done and ready to publish, build your xNFT:

```
yarn build
```

Test the newly created build in `dist/index.html` in the simulator:

```
yarn start
```

Once everything looks good head over to [xnft.gg](https://www.xnft.gg) to publish your xNFT!

## Setting up your Environment

Point your app to the corect place. However you want to do it (dotenv etc), you'll need process.env to be pouplated with these variables. Below is a .env example for pointing to Solarplex's dev forum:

```bash
ACTIVE_CHAIN=SolanaDev
SOLARPLEX_REALM=dev
FORUM=yjtu_Y1CgN98OJOF
```

## A (very) simple Postbox component

```Typescript
import { PostboxEntityJson } from "@dispatch-services/db-forum-common/entities";
import { 
  useCounts,
  usePosts,
  useUserProfile
} from "@dispatch-services/app-forum-store/modules";
import { useTime } from "@dispatch-services/store";

export function Postbox({ postboxJson }: { postboxJson: PostboxEntityJson}): JSX.Element  {
  // Get the display aprams for a user profile.
  const userDisplayParams = useUserProfile((m) => m.getters.getProfileDisplayParams(postboxJson));
  // Truncate the wallet if there is only a wallet for a display name.
  const userDisplayName = useUserProfile(() => userDisplayParams.wallet === userDisplayParams.displayName ? userDisplayParams.displayWallet : userDisplayParams.displayName);
  // Get the score for the user.
  const userScore = useUserProfile((m) => m.getters.getUserScore(postboxJson.creatorId));
  // Get the number of direct children the postbox has (ie replies)
  const children = useCounts((m) => m.getters.getCount(postboxJson, 'children'));
  // Getting the votes
  const upVotes = useCounts((m) => m.getters.getCount(postboxJson, 'upVotes'));
  const downVotes = useCounts((m) => m.getters.getCount(postboxJson, 'downVotes'));
  // Getting the score of the postbox.
  const score = useCounts((m) => m.getters.getCount(postboxJson, 'score'));
  // An example of formatting the time. You'd probably want your own formatter.
  const date = useTime((m) => m.getters.getFormattedDate(postboxJson.time));
  return (
    <div>
      { postboxJson.title && <div><b>{ postboxJson.title }</b></div> }
      { postboxJson.body && <div>{ postboxJson.body }</div>}
      <div>By {`${ userDisplayName } (${ userScore })`} at { date }</div>
      <div>Up: { upVotes } Down: { downVotes } Replies: { children } Score: { score } actionId: { postboxJson.actionId }</div>
    </div>
  )
}
```

## Fetching all of the topics for a forum:

```Typescript
import { 
  useForums,
  useTopics,
  useUser
} from "@dispatch-services/app-forum-store/modules";

export function Topics({ forumActionId }: { forumActionId : string }) : JSX.Element  {
  const forum = useForums((module) => module.getters.getForum(forumActionId));
  // The user id is derived from the wallet that is connected.
  const userId = useUser((module) => module.computed.userId);
  const topics = useTopics((module) => module.getters.getNewestTopicsForForum(forumActionId));
  // Get the topics whenever forumActionId changes or the user changes.
  useEffect(() => {
    if (forumActionId) {
      void useTopics.actions.fetchNewestTopicsForForum(forumActionId, userId);
    }
  }, [forumActionId, userId]);
  // Getting the number of topics.
  const numTopics = useCounts((module) => module.getters.getCount(forum, 'children') || topics.length);
  
  // Determine loading. IsLoading === never fetched before, IsBusy === fetching.
  const isLoadingTopics = useTopics(
    () =>
      (!forum || !topics.length) &&
      (useTopics.getters.fetchNewestTopicsForForumIsBusy(forumActionId, userId) ||
        useTopics.getters.fetchNewestTopicsForForumIsLoading(forumActionId, userId))
  );
  // Know if you should display "No topics" or not.
  const noTopics = useTopics(() => !!forum && !numTopics && !isLoading);
  return (
      <div>
        { isLoadingTopics ? 'Loading' : `(${numTopics} Topics)`}</span></div>
        { !isLoading && topics.map((postboxJson) => (<Postbox key={postboxJson.id} postboxJson={ postboxJson }></Postbox>))}
        { noTopics && <div>No Topics Yet</div>}
      </div>
  );
}
```

## Creating a Topic
🚨 Important Note 🚨: Right now the store epects you to be using [wallet adapter](https://github.com/solana-labs/wallet-adapter). If you are, then everything will just work automagically. If you are not, let us know what you are using and maybe we can fit in support for that. Otherwise your journey is going to be long and confusing (but not impossible!).

Note: The HTML returned here isn't greate for accessibilty etc. It is just an example that is very low effort on my part to write.
```Typescript
import { PostboxEntityJson } from "@dispatch-services/db-forum-common/entities";
import { useTopics } from "@dispatch-services/app-forum-store/modules";
import { ChangeEvent, useState } from 'react';


export function CreateTopic({ forumActionId }: { forumActionId : string }) : JSX.Element  {
  const [newTopic, setNewTopic] = useState<{
    title: string;
    description: string;
  }>({ title: '', description: '' });
  
  const userId = useUser((module) => module.computed.userId);

  // Check if creating the new topic is in flight.
  const creatingNewTopic = useTopics((m) =>
    m.getters.createTopicIsBusy(newTopic.title, newTopic.description, forumActionId)
  );

  // Get error if there's an error for creating that topic.
  const error = useTopics((m) => useTopics.getters.createTopicError(newTopic.title, newTopic.description, forumId));

  // The method for actually creating it.
  async function createTopic() {
    await useTopics.actions.createTopic(title, body, forumActionId);
  }

  function onInputChange(key: keyof typeof newTopic, e: ChangeEvent<HTMLInputElement>) {
    setNewTopic({ ...newTopic, [key]: e.target.value });
  }

  return (
    <div>
      { error && <div class="error">{ error.message }</div> }
      <Input disabled={ !userId } data-param="title" onChange={ (e) => onInputChange('title', e) } />
      <Input disabled={ !userId } data-param="body" onChange={ (e) => onInputChange('body', e) } />
      <button disabled={ !userId }>{ !userId ? 'Connect your wallet to post' : 'Post' }</button>
    </div>
  );
}
```

## Vote on a Postbox
🚨 Important Note 🚨: Same as above -- expects Wallet Adapter.

```Typescript
import { PostboxEntityJson } from "@dispatch-services/db-forum-common/entities";
import {
  useCounts, 
  useVotes,
  useUser,
  useWallet 
} from "@dispatch-services/app-forum-store/modules";
import { SyntheticEvent } fron 'react';

export function Vote({ postboxJson }: { postboxJson: PostboxEntityJson}): JSX.Element  {
  const userId = useUser((module) => module.computed.userId);
  // Get the voting properties for the postbox.
  const upVotes = useCounts((m) => m.getters.getCount(postboxJson, 'upVotes'));
  const downVotes = useCounts((m) => m.getters.getCount(postboxJson, 'downVotes'));
  // Note: These will pick up changes in edits etc.
  const alreadyUpVoted = useVotes((module) => module.getters.userUpvoted(postboxJson.id));
  const alreadyDownVoted = useVotes((module) => module.getters.userDownvoted(postboxJson.id));
  
  // Get if the vote is in flight to the server. Note "1" for upvote -1 for downvote.
  const isPending = useVotes(
    (m) => m.getters.createOrEditVoteIsBusy(1, postboxJson.id) || m.getters.createOrEditVoteIsBusy(-1, postboxJson.id)
  );

  // Get the error if there is one.
  const error = useVotes(
    (m) => m.getters.createOrEditVoteError(1, postboxJson.id) || m.getters.createOrEditVoteError(-1, postboxJson.id)
  );

  // No need to show loading if the user is signed in and has wallet popups turned off.
  const hasFunds = useWallet((module) => module.computed.hasFunds);
  const loading = useVotes(() => !hasFunds && isPending);

  async function vote(e: SyntheticEvent, value: 1 | -1) {
    await useVotes.actions.createOrEditVote(value, postboxJson.id);
  }

  return (
    <div>
      { error && <div class="error">error.message</div> }
      <button disabled={!userId || alreadyUpVoted} onClick={ (e) => vote(e, 1) }>
        👍 { alreadyUpvoted && isPending ? <Spinner /> : upVotes }
      </button>
      <button disabled={!userId || alreadyUpVoted} onClick={ (e) => vote(e, -1) }>
        👎 { alreadyDownvoted && isPending ? <Spinner /> : downVotes}
      </button>
    </div>
  )
}

```

## Using the API directly
All actions follow the same format. Create the action object, hash it, send that up to /actions which will return an array
of pending actions, find the action returned and get the txn integer array, then use that, sign it, send to chain.

There are two apis -- dev and prod. The base urls (unsurprisingly) are:

```
https://dev.api.solarplex.xyz
https://prod.api.solarplex.xyz
```


### Endpoints
All endpoints will always return an array of entities (even if there is only 1). Each entity will be JSON that has
an id attribute. Use this id attribute for edits or parent ids when creating actions (discussed later).

Each entity will also have an actionId attribute that will be the actionId that created that entity. Multiple
entities can be created by a single action.

Note: Users are created when an action is crawled and that user -- keyed by their wallet address -- hasn't been created
yet. So there is no signing in or registering. This is done automatically on your first action.

Here are some useful endpoints for GETS

Get pending actions for a user:
```
https://dev.api.solarplex.xyz/action/pending/tmpdid-${base58WalletAddress}:0096
```

Get all posts for a topic (along with interactions -- ie if a user voted on any of them -- if a creatorId query params is passed) 

Note: those are ACTION Ids, not Ids. So, for example, the actionId for the solarplex dev forum is `yjtu_Y1CgN98OJOF`

Note deux: All entities needed will be returned including ancestor entities like topic and forum.
```
https://dev.api.solarplex.xyz/entities/forum/:forumActionId/topic/:topicActionId?creatorId=tmpdid-${base58WalletAddress}:0096
```

### Creating the action.
An action can have 3 crud types:
```
1: POST
2: PUT
3: DELETE
```

Any action that is a PUT or DELETE will need to pass a crudEnityId  --> the id of the postbox you are editing.

Any action that is a POST will need to pass a parentId --> the parent Id you are adding a child to.

For example, creating a Topic for a forum would mean you would pass the Forum Id.

Solarplex on dev happens to be: `yjtu_Y1CgN98OJOF,000063cd7fbb001400000b5dda280000,0032'`

Don't worry, we'll help you get your forum id!

Each action needs to know what type of entity you are creating. For the sake of this quick documentation, the types
you would be concerned with are:
```
100: Post
140: Topic
160: Vote
```
Each action will also have a "params" field that has "title", "body", and "value" (only for votes) attributes.

A Topic needs a title, but a body is optional.

A Post, which is a reply to a Topic, or a reply to another Post (only 1 level deep is shown on Solarplex currently, but we support
up to 600ish levels deep for threading. We suggest only using 10 at max. Or better yet, just replying to replies like we do now!)

A vote only needs a value, which is 1 for upvote, -1 for downvote.

```Typescript
const action = {
  crud: 1, // Crud.Post
  type: 140, // EntityType.Topic
  parentId: 'xyz123 -- whatever the parent is', // Note, if crud was 2 or 3, you would use crudEntityId here instead.
  params: { 
    title: 'Hello World', 
    body: 'How we livin?', // <-- supports markdown https://www.markdownguide.org/cheat-sheet/
    value: 1, // <-- only use for votes!
  },
};
```

### Creating the RPC
```Typescript
const localActionId = ++someCounter;

const rpc = {
  creatorId: `tmpdid-${base58WalletAddress}:0096`,
  wallet: base58WalletAddress,
  chainId: 20, // Chain.SolanaDev -- local = 10, prod = 30
  hash: SHA256(JSON.stringify(action)), // action was created above!
  action,
  meta: {
    // Any metadata you want passed along with this action. It will be passed back to you (not stored) so that you can later identify the action you sent up. We use actionId which, but you can honestly use whatever. Just make sure it's unique!
    actionId: localActionId
  }
}

const postData = {
  action: rpc, // <-- That's right. Could be better nomenclature!!
}

// POST postData to https://dev.api.solarplex.xyz/action

// Returns same as getting pending actions (outlined below)

```

### Getting pending actions
All entities will have a model status attribute ('status') that is an enum:
```
0: Pending
1: Error
```
You will only be returned actions that are either of these statuses. When an action has been crawled, it will have a status of 2 (Active)
and will not be returned by the pending actions endpoint.

Any actions in pending state will come back with an integer array that is to be used to recreate the signed transaction by the server.

You will then have the wallet sign that transaction and send it to (TODO: Z or V -- program address?)

```Typescript

// GET https://dev.api.solarplex.xyz/action/pending/tmpdid-${base58WalletAddress}:0096

// This will return actions and other entities associated with them (like the user and the profile and the counts of the user -- score, actions, etc)

```