const database = require("../database/sheetsToDiscordLinks");

const natural = require("natural");

const { Collection, AttachmentBuilder } = require("discord.js");

const { findBestMatch } = require("string-similarity");

const { google } = require("googleapis");
const { JWT } = require("google-auth-library");
const webLinkRegex = /^(https?|http):\/\/[^\s/$.?#].[^\s]*$/i;
const keys = require("../jwt.json");

const { v4: uuidv4 } = require("uuid");

module.exports = async (client, uuid) => {
    const data = await database.findOne({ uuid });

    if (!data) return;

    const {
        limitPerDay,
        startingFetchRowNumber,
        spreadsheetId,
        sheetId,
        previousData,
        channelId,
        postExisting,
    } = data;

    const sheets = google.sheets("v4");

    const auth = new JWT({
        email: keys.client_email,
        key: keys.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    console.log("Fetching...");

    const res = await sheets.spreadsheets
        .get({
            spreadsheetId: spreadsheetId,
            auth,
            includeGridData: true,
        })
        .catch((err) => {
            logger.error(err);
            return null;
        });

    if (!res) return;
    const sheetData = res.data.sheets.find(
        (s) => s.properties.sheetId == sheetId
    );

    console.log("Done");

    if (!sheetData) return;

    const sheetName = sheetData.properties.title;

    const sheetValueData = await sheets.spreadsheets.values
        .get({
            spreadsheetId,
            range: sheetName,
            valueRenderOption: "FORMATTED_VALUE",
            auth,
        })
        .catch((err) => {
            logger.error(err);
            return null;
        });
    const rawValues = (sheetValueData?.data?.values || []).map((x, i) => ({
        data: x,
        i,
    }));

    const values = rawValues.slice(startingFetchRowNumber);
    if (!values.length || values.length < 2) return;

    const metadata = sheetData.data[0].rowData;

    const titleData = values.shift().data;

    const changedContent = [];

    const oldData = previousData;
    const newData = new Collection();

    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        let oldRow = oldData[row.i];
        if (oldRow) {
            if (!arraysEqual(oldRow.data, row.data)) {
                oldRow.data = row.data;
            }
            newData.set(oldRow.uuid, oldRow);
            if (oldRow.messageId) changedContent.push(oldRow);
        } else {
            const uuid = uuidv4();
            newData.set(uuid, {
                uuid,
                data: row.data,
                rowIndex: row.i,
            });
        }
    }
    if (changedContent.length) {
        client.logger.info(`Updating ${changedContent.length} items`);
        for (const content of changedContent) {
            client.logger.info(`Updating row ${content.rowIndex}`);
            const forumChannel = await client.channels
                .fetch(channelId)
                .catch(() => null);

            if (!forumChannel) continue;

            const { availableTags } = forumChannel;

            const threadChannel = await forumChannel.threads
                .fetch(content.messageId)
                .catch(() => null);

            if (!threadChannel) {
                newData.delete(content.uuid);
                continue;
            }

            const ogMessage = await threadChannel
                .fetchStarterMessage()
                .catch(() => null);

            if (!ogMessage) {
                newData.delete(content.uuid);
                continue;
            }

            const rowData = content.data
                .map((x, i) => ({
                    value: x,
                    i,
                }))
                .filter((x) => Boolean(x.value));

            let imageLinks = [];
            const announceUpdateList = [];

            const arrayWithHidden = rowData
                .map((x) => {
                    const links = parseTextWithImageLinks(x.value);
                    if (links.length) {
                        imageLinks.push(...links);
                        return { value: null };
                    }

                    const rowMetadata = metadata[content.rowIndex].values
                        .filter((item) => item.hyperlink)
                        .find(
                            (y) => x.value.trim() === y.formattedValue.trim()
                        );

                    if (titleData[x.i]) {
                        const headingSetting = data.headingsSettings.get(
                            titleData[x.i].trim()
                        );

                        const displayName =
                            headingSetting?.displayName || titleData[x.i];

                        if (headingSetting?.announceWhenUpdate) {
                            announceUpdateList.push(
                                `${displayName}:\n${x.value}`
                            );
                            return {
                                value: `${displayName}:\n${x.value}`,
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                                type: headingSetting?.group || "DEFAULT",
                                hidden: true
                            };
                        } else if (
                            (rowMetadata?.hyperlink ||
                                webLinkRegex.test(x.value)) &&
                            headingSetting?.shown !== "3"
                        ) {
                            return {
                                value: `[${displayName}](${
                                    rowMetadata?.hyperlink || x.value
                                })`,
                                type: headingSetting?.group || "zLINKS",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else if (headingSetting?.shown === "2") {
                            return {
                                value: `${displayName}: ${x.value}`,
                                type: headingSetting?.group || "DEFAULT",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else if (headingSetting?.shown === "3") {
                            return {
                                value: x.value,
                                hidden: true,
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else {
                            return {
                                value: x.value,
                                type: headingSetting?.group || "DEFAULT",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        }
                    } else {
                        return { value: null, type: "DEFAULT" };
                    }
                })
                .filter((x) => Boolean(x.value));

            const title = arrayWithHidden.filter((x) => x.titlePriority).length
                ? arrayWithHidden.filter((x) => x.titlePriority)[0].rawValue
                : arrayWithHidden[0].rawValue;
            const parsedData = arrayWithHidden.filter((x) => !x.hidden);

            if (parsedData.length) {
                const parsedText = [
                    {
                        type: "DEFAULT",
                        data: parsedData
                            .filter((cell) => cell.type === "DEFAULT")
                            .map((x) => x.value),
                    },
                    ...parsedData
                        .filter(
                            (cell) =>
                                cell.type !== "DEFAULT" &&
                                cell.type !== "zLINKS"
                        )
                        .reduce((result, item) => {
                            const existingItem = result.find(
                                (x) => x.type === item.type
                            );
                            if (existingItem) {
                                existingItem.data.push(item.value);
                            } else {
                                result.push({
                                    type: item.type,
                                    data: [item.value],
                                });
                            }
                            return result;
                        }, []),
                    {
                        type: "zLINKS",
                        data: parsedData
                            .filter((cell) => cell.type === "zLINKS")
                            .map((x) => x.value),
                    },
                ]
                    .map((x) => {
                        if (x.type !== "DEFAULT" && x.type !== "zLINKS") {
                            return `${x.type}\n${x.data
                                .map((y) => `- ${y.replace(/\n/g, ", ")}`)
                                .join(
                                    "\n"
                                )}\n--------------------------------------------------------------------------------------`;
                        } else {
                            return x.data.join("\n\n");
                        }
                    })
                    .join("\n\n");

                const tags = availableTags.length
                    ? natural.PorterStemmer.tokenizeAndStem(parsedText)
                          .map((word) => {
                              const match = findBestMatch(
                                  word,
                                  availableTags.map((tag) => tag.name)
                              );

                              if (match.bestMatch.rating >= 0.58) {
                                  return availableTags[match.bestMatchIndex];
                              } else {
                                  return null;
                              }
                          })
                          .filter((x) => Boolean(x))
                    : [];

                await ogMessage.edit({
                    content: parsedText,
                    files: imageLinks.length
                        ? imageLinks.map(
                              (file) =>
                                  new AttachmentBuilder(file.link, {
                                      name: file.fileName,
                                  })
                          )
                        : [],
                });

                if (availableTags.length) {
                    await threadChannel
                        .setAppliedTags(tags.map((tag) => tag.id))
                        .catch(() => null);
                }

                await threadChannel.setName(title);
            }
            if (announceUpdateList.length) {
                await threadChannel.send({
                    content: announceUpdateList.join("\n\n"),
                });
            }
        }
    }
    const unpostedContent = postExisting ? [...newData.filter((x) => !x.messageId).values()] : [...newData.filter((x) => !x.messageId && !x.initializedRow).values()];

    if (unpostedContent.length) {
        let upcomingContent =
            unpostedContent.length < limitPerDay
                ? unpostedContent
                : unpostedContent.slice(0, limitPerDay);
        client.logger.info(`Posting ${upcomingContent.length} items`);

        for (const content of upcomingContent) {
            client.logger.info(`Posting row ${content.rowIndex}`);
            const targetChannel = await client.channels
                .fetch(channelId)
                .catch(() => null);

            if (!targetChannel) continue;

            const { availableTags } = targetChannel;

            const rowData = content.data
                .map((x, i) => ({
                    value: x,
                    i,
                }))
                .filter((x) => Boolean(x.value));

            let imageLinks = [];
            const announceUpdateList = [];

            const arrayWithHidden = rowData
                .map((x) => {
                    const links = parseTextWithImageLinks(x.value);
                    if (links.length) {
                        imageLinks.push(...links);
                        return { value: null };
                    }

                    const rowMetadata = metadata[content.rowIndex].values
                        .filter((item) => item.hyperlink)
                        .find(
                            (y) => x.value.trim() === y.formattedValue.trim()
                        );

                    if (titleData[x.i]) {
                        const headingSetting = data.headingsSettings.get(
                            titleData[x.i].trim()
                        );

                        const displayName =
                            headingSetting?.displayName || titleData[x.i];

                        if (headingSetting?.announceWhenUpdate) {
                            announceUpdateList.push(
                                `${displayName}:\n${x.value}`
                            );
                            return {
                                value: `${displayName}:\n${x.value}`,
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                                type: headingSetting?.group || "DEFAULT",
                                hidden: true
                            };
                        } else if (
                            (rowMetadata?.hyperlink ||
                                webLinkRegex.test(x.value)) &&
                            headingSetting?.shown !== "3"
                        ) {
                            return {
                                value: `[${displayName}](${
                                    rowMetadata?.hyperlink || x.value
                                })`,
                                type: headingSetting?.group || "zLINKS",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else if (headingSetting?.shown === "2") {
                            return {
                                value: `${displayName}: ${x.value}`,
                                type: headingSetting?.group || "DEFAULT",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else if (headingSetting?.shown === "3") {
                            return {
                                value: x.value,
                                hidden: true,
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        } else {
                            return {
                                value: x.value,
                                type: headingSetting?.group || "DEFAULT",
                                titlePriority: headingSetting?.titlePriority,
                                rawValue: x.value,
                            };
                        }
                    } else {
                        return { value: null, type: "DEFAULT" };
                    }
                })
                .filter((x) => Boolean(x.value));

            const title = arrayWithHidden.filter((x) => x.titlePriority).length
                ? arrayWithHidden.filter((x) => x.titlePriority)[0].rawValue
                : arrayWithHidden[0].rawValue;
            const parsedData = arrayWithHidden.filter((x) => !x.hidden);

            if (parsedData.length) {
                const parsedText = [
                    {
                        type: "DEFAULT",
                        data: parsedData
                            .filter((cell) => cell.type === "DEFAULT")
                            .map((x) => x.value),
                    },
                    ...parsedData
                        .filter(
                            (cell) =>
                                cell.type !== "DEFAULT" &&
                                cell.type !== "zLINKS"
                        )
                        .reduce((result, item) => {
                            const existingItem = result.find(
                                (x) => x.type === item.type
                            );
                            if (existingItem) {
                                existingItem.data.push(item.value);
                            } else {
                                result.push({
                                    type: item.type,
                                    data: [item.value],
                                });
                            }
                            return result;
                        }, []),
                    {
                        type: "zLINKS",
                        data: parsedData
                            .filter((cell) => cell.type === "zLINKS")
                            .map((x) => x.value),
                    },
                ]
                    .map((x) => {
                        if (x.type !== "DEFAULT" && x.type !== "zLINKS") {
                            return `${x.type}\n${x.data
                                .map((y) => `- ${y.replace(/\n/g, ", ")}`)
                                .join(
                                    "\n"
                                )}\n--------------------------------------------------------------------------------------`;
                        } else {
                            return x.data.join("\n\n");
                        }
                    })
                    .join("\n\n");

                const tags = availableTags.length
                    ? natural.PorterStemmer.tokenizeAndStem(parsedText)
                          .map((word) => {
                              const match = findBestMatch(
                                  word,
                                  availableTags.map((tag) => tag.name)
                              );

                              if (match.bestMatch.rating >= 0.58) {
                                  return availableTags[match.bestMatchIndex];
                              } else {
                                  return null;
                              }
                          })
                          .filter((x) => Boolean(x))
                    : [];
                const threadChannel = await targetChannel.threads
                    .create({
                        name: title,
                        appliedTags: tags.length
                            ? tags.map((tag) => tag.id)
                            : [],
                        message: {
                            content: parsedText,
                            files: imageLinks.length
                                ? imageLinks.map(
                                      (file) =>
                                          new AttachmentBuilder(file.link, {
                                              name: file.fileName,
                                          })
                                  )
                                : [],
                        },
                    })
                    .catch((err) => null);

                if (!threadChannel) continue;

                if (announceUpdateList.length) {
                    await threadChannel.send({
                        content: announceUpdateList.join("\n\n"),
                    });
                }
                threadChannel
                    .fetchStarterMessage()
                    .then((msg) => msg.suppressEmbeds(true))
                    .catch(() => null);

                const obj = newData.get(content.uuid);
                obj.messageId = threadChannel.id;
            }
        }
    }
    const dataArray = [...newData.values()];

    dataArray.forEach((row) => (data.previousData[row.rowIndex] = row));

    await data.save();
};

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}
function parseTextWithImageLinks(text) {
    const imageLinkRegex =
        /https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|bmp|tiff|webp|svg|ico)(\?\S+)?/gi;

    const matches = text.match(imageLinkRegex);

    if (!matches) return [];

    const linkObjects = matches.map((match) => {
        const fileName = match.split("/").pop();
        return { fileName, link: match };
    });

    return linkObjects;
}
