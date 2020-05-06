const queryPagingOptions = (page, limit, options = []) => {
    return [
        {
            $facet: {
                "count":
                    [
                        {
                            $count: "status"
                        }
                    ],
                "docs": [
                    {
                        $skip: (page - 1) * limit
                    },
                    {
                        $limit: limit
                    }
                ]
            }
        },
        {
            $project: {
                docs: 1,
                count: { "$arrayElemAt": ["$count", 0] }
            }
        },
        {
            $project: {
                docs: 1,
                totalDocs: { $toInt: "$count.status" }
            }
        },
        {
            $addFields: {
                totalPages: { $ceil: { $divide: ["$totalDocs", limit] } },
                page,
                limit
            }
        },
        {
            $addFields: {
                hasPrevPage: { $cond: [{ $gt: ["$page", 1] }, true, false] },
                hasNextPage: { $cond: [{ $lt: ["$page", "$totalPages"] }, true, false] },
                //                pagingCounter: 1,
                prevPage: {
                    $cond: [
                        { $lte: [page - 1, 0] }, //page -1
                        null,
                        page - 1]//page -1
                },
                nextPage: {
                    $cond: [
                        { $gt: [page + 1, "$totalPages"] }, //page +1
                        null,
                        page + 1]//page +1
                },
            }
        },
        ...options
    ];
}
const queryPagingOptionsSample = (page, limit, options = []) => {
    return [
        {
            $facet: {
                "count":
                    [
                        {
                            $count: "status"
                        }
                    ],
                "docs": [
                    {
                        $skip: (page - 1) * limit
                    },
                    {
                        $sample: { size: limit }
                    }
                ]
            }
        },
        {
            $project: {
                docs: 1,
                count: { "$arrayElemAt": ["$count", 0] }
            }
        },
        {
            $project: {
                docs: 1,
                totalDocs: { $toInt: "$count.status" }
            }
        },
        {
            $addFields: {
                totalPages: { $ceil: { $divide: ["$totalDocs", limit] } },
                page,
                limit
            }
        },
        {
            $addFields: {
                hasPrevPage: { $cond: [{ $gt: ["$page", 1] }, true, false] },
                hasNextPage: { $cond: [{ $lt: ["$page", "$totalPages"] }, true, false] },
                //                pagingCounter: 1,
                prevPage: {
                    $cond: [
                        { $lte: [page - 1, 0] }, //page -1
                        null,
                        page - 1]//page -1
                },
                nextPage: {
                    $cond: [
                        { $gt: [page + 1, "$totalPages"] }, //page +1
                        null,
                        page + 1]//page +1
                },
            }
        },
        ...options
    ];
}
const querySelect = project => {
    return [{
        $project: project
    }]
}
const queryPopulateAge = populate => {
    let query = []
    //Add Match Lookup
    let match_lookup = (element) => element.match
        ? [element.in ? { $in: [element.foreignField, "$$value"] } : { $eq: [element.foreignField, "$$value"] }, ...element.match]
        : [element.in ? { $in: [element.foreignField, "$$value"] } : { $eq: [element.foreignField, "$$value"] }]
    populate.forEach( element => {
        query.push({
            $lookup: {
                let: { value: element.removeObjectId ? element.localField : { $toObjectId: element.localField } }
                , from: element.ref
                , pipeline: element.pipeline
                    ? element.pipeline
                    : [
                        {
                            $match: {
                                $expr: { $and: [...match_lookup(element)] }
                            }
                        }
                        , ...element.facet ? element.facet : []
                        , {
                            $project: element.project ? element.project : { __v: 0 }
                        }]
                , as: element.virtualName
            }

        })
        if (element.unwind) {
            query.push(element.preserve
                ? { $unwind: { path: '$' + element.virtualName, preserveNullAndEmptyArrays: true } }
                : { $unwind: '$' + element.virtualName })

        }
    });
    return query;
}
const querySearchAllAge = (search, containKeys) => {
    let query = [];
    search.map(element => {
        const temp = element.split(":");
        if (containKeys.includes(temp[0])) {
            query.push(
                {
                    $eq: [
                        {
                            $regexMatch:
                                { input: '$' + temp[0], regex: new RegExp(temp[1]), options: "i" }
                        }
                        , true
                    ]
                }
            );
        }
    })
    return !isEmpty(query)
        ? {
            $match: {
                $expr:
                {
                    $or: [...query]
                }
            }
        }
        : null
}
const querySearchAge = (search, containKeys) => {
    let query = [], or = [];
    search.map(element => {
        const temp = element.split(":");
        let findAll = {};
        if (containKeys.includes(temp[0])) {
            findAll[temp[0]] = { $regex: new RegExp(temp[1]), $options: 'i' };
            or.push(findAll);
        }
    })

    query = [{ $match: { $or: or } }]
    return query.length
        ? query
        : null
}
const isEmpty = variable => {
    const type = typeof variable
    if (variable === null) return true
    if (type === 'undefined') return true
    if (type === 'boolean') return false
    if (type === 'number') return false
    if (type === 'string') return !variable
    if (Array.isArray(variable)) return !variable.length
    if (type === 'object') return !Object.keys(variable).length
    return !variable
}

function Generator() { }

Generator.prototype.queryPagingOptions = (page, limit, options) => queryPagingOptions(page, limit, options);

Generator.prototype.queryPagingOptionsSample = (page, limit, options) => queryPagingOptionsSample(page, limit, options);

Generator.prototype.querySelect = search => querySelect(search);

Generator.prototype.queryPopulateAge = populate => queryPopulateAge(populate);

Generator.prototype.querySearchAge = (search, containKeys) => querySearchAge(search, containKeys);

Generator.prototype.querySearchAllAge = (search, containKeys) => querySearchAllAge(search, containKeys);

Generator.prototype.isEmpty = variable => isEmpty(variable);

module.exports = Generator
