import { Connection, PublicKey } from "@solana/web3.js";
import { Event, XnftMetadata } from "@coral-xyz/common-public";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    xnft: any;
  }
}

export { useColorScheme } from "react-native";

/** @deprecated use `usePublicKeys()` instead */
export function usePublicKey(): PublicKey | undefined {
  const didLaunch = useDidLaunch()
  const [publicKey, setPublicKey] = useState();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("publicKeyUpdate", () => {
        setPublicKey(window.xnft.solana.publicKey);
      });
      setPublicKey(window.xnft.solana.publicKey);
    }
  }, [didLaunch, setPublicKey]);
  return publicKey;
}

export function usePublicKeys(): { [key: string]: PublicKey }|undefined {
  const didLaunch = useDidLaunch() 
  const [publicKeys, setPublicKeys] = useState();
  useEffect(() => {
    if(didLaunch) {
      window.xnft.on("publicKeysUpdate", () => {
        setPublicKeys(window.xnft.publicKeys);
      });
      setPublicKeys(window.xnft.publicKeys);
    }
  }, [didLaunch, setPublicKeys]);
  console.log('use pk', publicKeys);
  return publicKeys;
}

/** @deprecated use blockchain-specific connections instead */
export function useConnection(): Connection|undefined {
  const didLaunch = useDidLaunch() 
  const [connection, setConnection] = useState();
  useEffect(() => {
    if(didLaunch) {
      window.xnft.solana.on("connectionUpdate", () => {
        setConnection(window.xnft.solana.connection);
      });
      setConnection(window.xnft.solana.connection);
    }
  }, [didLaunch, setConnection]);
  return connection;
}

export function useSolanaConnection(): Connection|undefined {
  const didLaunch = useDidLaunch()
  const [connection, setConnection] = useState();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("connectionUpdate", () => {
        setConnection(window.xnft.solana.connection);
      });
      setConnection(window.xnft.solana.connection);
    }
  }, [didLaunch, setConnection]);
  console.log('use sc, ', connection);
  return connection;
}

export function useSolana(): Connection|undefined {
  const didLaunch = useDidLaunch()
  const [solana, setSolana] = useState();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("connectionUpdate", () => {
        setSolana(window.xnft.solana);
      });
      setSolana(window.xnft.solana);
    }
  }, [didLaunch, setSolana]);
  console.log('use ss, ', solana);
  return solana;
}

export function useEthereumConnection(): Connection|undefined {
  const didLaunch = useDidLaunch() 
  const [connection, setConnection] = useState();
  useEffect(() => {
    if(didLaunch) {
      window.xnft.ethereum?.on("connectionUpdate", () => {
        setConnection(window.xnft.ethereum.connection);
      });
      setConnection(window.xnft.ethereum.connection);
    }
  }, [didLaunch, setConnection]);
  return connection;
}

// Returns true if the `window.xnft` object is ready to be used.
export function useDidLaunch() {
  const [didConnect, setDidConnect] = useState(!!window.xnft?.connection);
  useEffect(() => {
    window.addEventListener("load", () => {
      window.xnft.on("connect", () => {
        console.log('cxnft on connect')
        setDidConnect(true);
      });
      window.xnft.on("disconnect", () => {
        setDidConnect(false);
      });
    });
  }, []);
  console.log('did connect', didConnect);
  return didConnect;
}

export const useReady = useDidLaunch;

export function useMetadata(): XnftMetadata|undefined {
  const didLaunch = useDidLaunch() 
  const [metadata, setMetadata] = useState();

  useEffect(() => {
    if(didLaunch) {
      setMetadata(window.xnft.metadata);
      window.xnft.addListener("metadata", (event: Event) => {
        setMetadata(event.data.metadata);
      });
    }
  }, [didLaunch, setMetadata]);
  return metadata;
}

export function useDimensions(debounceMs = 0) {
  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const debounce = (fn: Function) => {
    let timer: ReturnType<typeof setTimeout>;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearTimeout(timer);
        // @ts-ignore
        fn.apply(this, arguments);
      }, debounceMs);
    };
  };

  useEffect(() => {
    setDimensions({
      height: window.innerHeight,
      width: window.innerWidth,
    });

    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    });

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  return dimensions;
}
