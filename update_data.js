// Data to be stored in chrome.storage.sync
const dataToStore = {
    // books: [{\"lastRead\":\"2024-09-27\",\"page\":\"90\",\"title\":\"Structure of Comp Program\"},{\"lastRead\":\"2024-09-21\",\"page\":\"17\",\"title\":\"BIG ARCHIVE: SYSTEM DESIGN 2023\"},{\"lastRead\":\"2024-09-28\",\"page\":\"113\",\"title\":\"Computer Systems A Programmer’s Perspective\"}],
    // notes: [
    //   {
    //     color: "#9c27b0",
    //     deadline: "2024-11-01",
    //     fontColor: "#ffffff",
    //     order: 1,
    //     priority: "High",
    //     title: "LeetCode"
    //   },
    //   {
    //     color: "#2196f3",
    //     deadline: "2024-12-02",
    //     fontColor: "#000000",
    //     order: 2,
    //     priority: "High",
    //     title: "AWS Certif"
    //   }
    // ]
  };
  
  // Function to store data in chrome.storage.sync
  function storeDataInSyncStorage() {
      chrome.storage.sync.set(dataToStore, () => {
          if (chrome.runtime.lastError) {
              console.error("Error setting data:", chrome.runtime.lastError);
          } else {
              console.log("Data stored successfully:", dataToStore);
          }
      });
  }
  
  // Call the function to store the data
  storeDataInSyncStorage();
  