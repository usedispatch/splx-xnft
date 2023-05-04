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
  
  // Get the type of the postbox so we use the correct module.
  const isTopic = useTopics(() => getTypeFromId(post.id) === EntityType.Topic);
  
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

